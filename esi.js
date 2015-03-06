/* jshint node:true */
/* global Promise */

'use strict';

var parse5 = require('parse5'),
    request = require('request'),
    url = require('url'),

    getCacheTime = require('./get-cache-time');


function ESI(config) {
    config = config || {};

    this.baseUrl = config.baseUrl || '';
    this.defaultTimeout = config.defaultTimeout || 2000;

    this.cache = config.cache;
    this.request = config.request || request;
    this.parser = config.parser || new parse5.Parser();
    this.serializer = config.serializer || new parse5.Serializer();
}

ESI.prototype.makeRequestOptions = function(url) {
    return {
        timeout: this.defaultTimeout,
        url: this.toFullyQualifiedURL(url)
    };
};

ESI.prototype.toFullyQualifiedURL = function(urlOrPath) {
    if(urlOrPath.indexOf('http') === 0) {
        return urlOrPath;
    } else {
        return url.resolve(this.baseUrl, urlOrPath);
    }
};

ESI.prototype.get = function(options) {
    var self = this;

    return new Promise(function(resolve, reject) {
        if(self.cache) {
            self.cache.get(options.url).then(function(result) {
                if(result.expired) {
                    self.fetch(options);
                }
                resolve(result.value);
            }).catch(function() {
                self.fetch(options).then(resolve).catch(reject);
            });
        } else {
            self.fetch(options).then(resolve).catch(reject);
        }
    });
};

ESI.prototype.fetch = function(options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.request.get(options, function(error, response, body) {
            if(error || response.statusCode >= 400) {
                resolve('');
            } else {
                if(self.cache) {
                    self.cache.set(options.url, {
                        expiresIn: getCacheTime(response.headers['cache-control']),
                        value: body
                    });
                }
                resolve(body);
            }
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

ESI.prototype.replace = function(target, replacement) {
    var childNodes = target.parentNode.childNodes;

    childNodes.forEach(function(childNode, i) {
        if(childNode === target) {
            childNodes.splice.apply(childNodes, [i, 1].concat(replacement.childNodes));
        }
    });
};

ESI.prototype.include = function(node) {
    var self = this,
        src = node.attrs.filter(function(attr) {
            return attr.name === 'src';
        })[0].value;

    return new Promise(function(resolve, reject) {
        var options = self.makeRequestOptions(src);
        self.get(options).then(function(html) {
            var parsedHtml = self.parser.parseFragment(html);
            self.replace(node, parsedHtml);
            resolve();
        });
    });
};

ESI.prototype.process = function(html) {
    var self = this;

    return new Promise(function(resolve, reject) {
        var parsedHtml = self.parser.parseFragment(html),
            subtasks = [];
        
        self.walkTree(function(subtree) {
            if(subtree.nodeName === 'esi:include') {
                subtasks.push(self.include(subtree));
            }
        }, parsedHtml);

        Promise.all(subtasks).then(function() {
            resolve(self.serializer.serialize(parsedHtml));
        });
    });
};

module.exports = ESI;
