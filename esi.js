/* jshint node:true */
/* global Promise */

'use strict';

var cheerio = require('cheerio'),
    request = require('request'),
    url = require('url');

function ESI(config) {
    config = config || {};

    this.basePath = config.basePath || '';
    this.defaultTimeout = config.defaultTimeout || 2000;
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
    return new Promise(function(resolve, reject) {
        request.get(options, function(error, response, body) {
            if(error || response.statusCode >= 400) {
                resolve('');
            }
            else {
                resolve(body);
            }
        });
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

        Promise.all(urls.map(self.makeRequestOptions.bind(self)).map(self.get)).then(function(results) {
            results.forEach(function(result) {
                $('esi\\:include').first().replaceWith(result);
            });

            resolve($.html());
        });

    });
};

module.exports = ESI;
