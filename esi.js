/* jshint node:true */
/* global Promise */

'use strict';

var cheerio = require('cheerio'),
    request = require('request'),
    url = require('url'),
    getCacheTime = require('./get-cache-time');

function ESI(config) {
    config = config || {};

    this.basePath = config.basePath || '';
    this.defaultTimeout = config.defaultTimeout || 2000;
    this.cache = config.cache;
    this.request = config.request || request;
}

ESI.prototype.makeRequestOptions = function(url) {
    return {
        timeout: this.defaultTimeout,
        url: url
    };
};

ESI.prototype.toFullyQualifiedURL = function(base, urlOrPath) {
    if(urlOrPath.indexOf('http') === 0) {
        return urlOrPath;
    } else {
        return url.resolve(base, urlOrPath);
    }
};

ESI.prototype.get = function(options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(self.cache) {
            self.cache.get(options.url).then(function(result) {
                if(result.expired) {
                    new Promise(function(resolve, reject) {
                        self.fetch(options, resolve, reject);
                    });
                }
                resolve(result.value);
            }).catch(function() {
                self.fetch(options, resolve, reject);
            });
        } else {
            self.fetch(options, resolve, reject);
        }
    });
};

ESI.prototype.fetch = function(options, resolve, reject) {
    var self = this;
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
};


ESI.prototype.process = function(html) {
var self = this;

return new Promise(function(resolve, reject) {
    var $ = cheerio.load(html),
        sources = $('esi\\:include').map(function() {
            return $(this).attr('src');
            }).get(),
            urls = sources.map(self.toFullyQualifiedURL.bind(null, self.basePath));

        Promise.all(urls.map(self.makeRequestOptions.bind(self)).map(self.get.bind(self))).then(function(results) {
            results.forEach(function(result) {
                $('esi\\:include').first().replaceWith(result);
            });

            resolve($.html());
        });

    });
};

module.exports = ESI;
