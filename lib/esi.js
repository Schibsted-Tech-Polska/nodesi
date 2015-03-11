/* jshint node:true */
/* global Promise */

'use strict';

var parse5 = require('parse5'),

    getCacheTime = require('./get-cache-time'),
    Cache = require('./cache'),
    DataProvider = require('./data-provider'),
    Logger = require('./logger');

function ESI(config) {
    config = config || {};

    this.maxDepth = config.maxDepth || 3;
    this.onError = config.onError || function() { };

    this.cache = config.cache || new Cache(config);
    this.dataProvider = config.dataProvider || new DataProvider(config);
    this.parser = config.parser || new parse5.Parser();
    this.serializer = config.serializer || new parse5.Serializer();
    this.logger = new Logger(config);
}

ESI.prototype.processParsed = function(parsedHtml, options, state) {
    var self = this;
    options = options || {};

    state = state || {};
    state.currentDepth = state.currentDepth || 0;

    return new Promise(function (resolve, reject) {
        var subtasks = [],
            maxDepthReached = state.currentDepth > self.maxDepth;

        self.walkTree(function (subtree) {
            if (maxDepthReached) {
                if (subtree.nodeName.indexOf('esi:') === 0) {
                    subtasks.push(self.replaceWithBlank(subtree));
                }
            } else if (subtree.nodeName === 'esi:include') {
                subtasks.push(self.include(subtree, options));
            }
        }, parsedHtml);

        Promise.all(subtasks).then(function () {
            if (self.hasIncludeTag(parsedHtml)) {
                state.currentDepth++;
                self.processParsed(parsedHtml, options, state).then(function (result) {
                    resolve(result);
                });
            } else {
                resolve(parsedHtml);
            }
        });
    });
};

ESI.prototype.process = function (html, options) {
    var self = this;
    return this.processParsed(this.parser.parseFragment(html), options).then(function(result) {
        return self.serializer.serialize(result);
    });
};

ESI.prototype.walkTree = function (callback, tree) {
    var self = this;
    callback(tree);
    if (tree.childNodes && tree.childNodes.length > 0) {
        tree.childNodes.forEach(self.walkTree.bind(self, callback));
    }
};

ESI.prototype.hasIncludeTag = function (parsedHtml) {
    var includeTagPresent = false;

    this.walkTree(function (subtree) {
        if (subtree.nodeName === 'esi:include') {
            includeTagPresent = true;
        }
    }, parsedHtml);

    return includeTagPresent;
};

ESI.prototype.include = function (node, options) {
    var self = this,
        src = self.getIncludeSrc(node);

    return new Promise(function (resolve, reject) {
        self.get(src, options).then(function (html) {
            var parsedHtml = self.parser.parseFragment(html);

            self.replace(node, parsedHtml);
            resolve();
        });
    });
};

ESI.prototype.getIncludeSrc = function (node) {
    return node.attrs.filter(function (attr) {
        return attr.name === 'src';
    })[0].value;
};

ESI.prototype.get = function (src, options) {
    var self = this;
    src = self.dataProvider.toFullyQualifiedURL(src);

    return new Promise(function (resolve, reject) {
        self.cache.get(src)
            // in cache
            .then(function (result) {
                if (result.expired) {
                    self.dataProvider.get(src, options)
                        .then(function (result) {
                            self.setCacheResult(src, result);
                        });
                }
                resolve(result.value);
            })
            // not in cache
            .catch(function () {
                self.dataProvider.get(src, options)
                    .then(function (result) {
                        self.setCacheResult(src, result);
                        resolve(result.body);
                    })
                    .catch(function (error) {
                        resolve(self.handleError(src, error));
                    });
            });
    });
};

ESI.prototype.handleError = function(src, error) {
    var handlerResult = this.onError(src, error);
    
    if (typeof handlerResult === 'string') {
        return handlerResult;
    }
    return '';
};

ESI.prototype.setCacheResult = function (src, result) {
    this.cache.set(src, {
        expiresIn: getCacheTime(result.response.headers['cache-control']),
        value: result.body
    });
};

ESI.prototype.replace = function (original, replacement) {
    var childNodes = original.parentNode.childNodes;

    childNodes.forEach(function (childNode, i) {
        if (childNode === original) {
            // replace nodes
            childNodes.splice.apply(childNodes, [i, 1].concat(replacement.childNodes));
            
            // update parent
            replacement.childNodes.forEach(function(replacementChild) {
                replacementChild.parentNode = original.parentNode;
            });
        }
    });

};

ESI.prototype.replaceWithBlank = function(original) {
    var childNodes = original.parentNode.childNodes;

    childNodes.forEach(function (childNode, i) {
        if (childNode === original) {
            // remove node
            childNodes.splice(i, 1);
        }
    });

};

module.exports = ESI;
