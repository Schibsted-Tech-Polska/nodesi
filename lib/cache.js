/* jshint node:true */
/* global Promise */

'use strict';

var clone = require('clone');

function Cache(config) {
    config = config || {};

    this.clock = config.clock || Date;
    this.storage = {};
}

Cache.prototype.get = function(key) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var storageObj;
        if(self.storage.hasOwnProperty(key)) {
            storageObj = clone(self.storage[key]);
            storageObj.expired = self.clock.now() >= storageObj.expirationTime;
            resolve(storageObj);
        } else {
            reject(new Error('cache entry not found'));
        }
    });
};

Cache.prototype.set = function(key, storageObj) {
    var self = this;
    storageObj = clone(storageObj);
    return new Promise(function(resolve, reject) {
        storageObj.expirationTime = self.clock.now() + (storageObj.expiresIn || 0);
        self.storage[key] = storageObj;
        resolve();
    });
};

Cache.prototype.toString = function() {
    return JSON.stringify(this.storage);
};

module.exports = Cache;
