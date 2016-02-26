/* jshint node:true */

'use strict';

var goodGuyLib = require('good-guy-http'),
    goodGuy,
    url = require('url'),
    Promise = require('bluebird');

function DataProvider(config) {
    config = config || {};

    this.baseUrl = config.baseUrl || '';

    goodGuy = config.httpClient || goodGuyLib({
        cache: config.cache
    });
}

DataProvider.prototype.extendRequestOptions = function(src, baseOptions) {
    return {
        url: this.toFullyQualifiedURL(src),
        headers: baseOptions.headers
    };
};

DataProvider.prototype.toFullyQualifiedURL = function(urlOrPath) {
    if(urlOrPath.indexOf('http') === 0) {
        return urlOrPath;
    } else {
        return url.resolve(this.baseUrl, urlOrPath);
    }
};

DataProvider.prototype.get = function(src, baseOptions) {
    var self = this,
        options = self.extendRequestOptions(src, baseOptions || {});

    options.gzip = true; // For backwards-compatibility, response compression is not supported by default

    return  new Promise(function(resolve, reject) {
        goodGuy.get(options, function(error, response, body) {
            if(error || response.statusCode >= 400) {
                reject(error || new Error(response.statusCode));
            } else {
                resolve({
                    body: response.body,
                    response: response
                });
            }
        });
    });
};


module.exports = DataProvider;
