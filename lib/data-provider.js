/* jshint node:true */
/* global Promise */

'use strict';

var request = require('request'),
    url = require('url');

function DataProvider(config) {
    config = config || {};

    this.baseUrl = config.baseUrl || '';
    this.defaultTimeout = config.defaultTimeout || 2000;
}

DataProvider.prototype.extendRequestOptions = function(src, baseOptions) {
    return {
        timeout: this.defaultTimeout,
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

    return new Promise(function(resolve, reject) {
        request.get(options, function(error, response, body) {
            if(error || response.statusCode >= 400) {
                reject(error || new Error(response.statusCode));
            } else {
                resolve({
                    body: body,
                    response: response
                });
            }
        });
    });
};


module.exports = DataProvider;
