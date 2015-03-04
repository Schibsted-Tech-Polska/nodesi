/* jshint node:true */
/* global Promise */

'use strict';

var cheerio = require('cheerio'),
    http = require('http'),
    url = require('url');

var get = function(src) {
    return new Promise(function(resolve, reject) {
        http.get(src, function(response) {
            var body = '';

            response.on('readable', function() {
                body += response.read();
            });

            response.on('end', function() {
                resolve(body);
            });
        }).end();

    });
};

var toFullyQualifiedURL = function(base, urlOrPath) {
    if(urlOrPath.indexOf('http') === 0) {
        return urlOrPath;
    } else {
        return url.resolve(base, urlOrPath);
    }
};


function ESI(config) {
    config = config || {};

    this.basePath = config.basePath || '';
}

ESI.prototype.process = function(html) {
    var self = this;

    return new Promise(function(resolve, reject) {
        var $ = cheerio.load(html),
            sources = $('esi\\:include').map(function() {
                return $(this).attr('src');
            }).get(),
            urls = sources.map(toFullyQualifiedURL.bind(null, self.basePath));

        Promise.all(urls.map(get)).then(function(results) {
            results.forEach(function(result) {
                $('esi\\:include').first().replaceWith(result);
            });

            resolve($.html());
        });

    });
};

module.exports = ESI;
