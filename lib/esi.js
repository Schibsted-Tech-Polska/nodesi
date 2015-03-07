/* jshint node:true */
/* global Promise */

'use strict';

var parse5 = require('parse5'),

    getCacheTime = require('./get-cache-time'),
    Cache = require('./cache'),
    DataProvider = require('./data-provider');

function ESI(config) {
    config = config || {};

    this.cache = config.cache               || new Cache(config);
    this.dataProvider = config.dataProvider || new DataProvider(config);
    this.parser = config.parser             || new parse5.Parser();
    this.serializer = config.serializer     || new parse5.Serializer();
}

ESI.prototype.process = function(html, options) {
    var self = this;
    options = options || {};

    return new Promise(function(resolve, reject) {
        var parsedHtml = self.parser.parseFragment(html),
            subtasks = [];
        
        self.walkTree(function(subtree) {
            if(subtree.nodeName === 'esi:include') {
                subtasks.push(self.include(subtree, options));
            }
        }, parsedHtml);

        Promise.all(subtasks).then(function() {
            resolve(self.serializer.serialize(parsedHtml));
        });
    });
};

ESI.prototype.walkTree = function(callback, tree) {
    var self = this;
    callback(tree);
    if(tree.childNodes.length > 0) {
        tree.childNodes.forEach(self.walkTree.bind(self, callback));
    }
};

ESI.prototype.include = function(node, options) {
    var self = this,
        src = self.getIncludeSrc(node);

    return new Promise(function(resolve, reject) {
        self.get(src, options).then(function(html) {
            var parsedHtml = self.parser.parseFragment(html);
            self.replace(node, parsedHtml);
            resolve();
        });
    });
};

ESI.prototype.getIncludeSrc = function(node) {
    return node.attrs.filter(function(attr) {
        return attr.name === 'src';
    })[0].value;
};

ESI.prototype.get = function(src, options) {
    var self = this;

    return new Promise(function(resolve, reject) {
        self.cache.get(src)
            // in cache
            .then(function(result) {
                if(result.expired) {
                    self.dataProvider.get(src, options)
                        .then(function(result) {
                            self.setCacheResult(src, result);
                        });
                }
                resolve(result.value);
            })
            // not in cache
            .catch(function() {
                self.dataProvider.get(src, options)
                    .then(function(result) {
                        self.setCacheResult(src, result);
                        resolve(result.body);
                    })
                    .catch(function() { resolve(''); });
            });
    });
};

ESI.prototype.setCacheResult = function(src, result) {
    this.cache.set(src, {
        expiresIn: getCacheTime(result.response.headers['cache-control']),
        value: result.body
    });
};

ESI.prototype.replace = function(original, replacement) {
    var childNodes = original.parentNode.childNodes;

    childNodes.forEach(function(childNode, i) {
        if(childNode === original) {
            childNodes.splice.apply(childNodes, [i, 1].concat(replacement.childNodes));
        }
    });
};

module.exports = ESI;
