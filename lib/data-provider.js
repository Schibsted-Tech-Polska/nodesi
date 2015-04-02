/* jshint node:true */

'use strict';

var request = require('request'),
    url = require('url'),
    Promise = require('bluebird');

function DataProvider(config) {
    config = config || {};

    this.baseUrl = config.baseUrl || '';
    this.defaultTimeout = config.defaultTimeout || 2000;
    this.pending = {};
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

    options.gzip = true; // For backwards-compatibility, response compression is not supported by default

    if(!self.pending.hasOwnProperty(src)) {
        self.pending[src] = new Promise(function(resolve, reject) {
            request.get(options, function(error, response, body) {
                delete self.pending[src];

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
    }

    return self.pending[src];
};


module.exports = DataProvider;
