/* jshint node:true */
/* global Promise */

'use strict';

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
            storageObj = self.storage[key];
            storageObj.expired = self.clock.now() > storageObj.expirationTime;
            resolve(storageObj);
        }
        else {
            reject();
        }
    });
};

Cache.prototype.set = function(key, storageObj) {
    var self = this;
    return new Promise(function(resolve, reject) {
        storageObj.expirationTime = self.clock.now() + storageObj.expiresIn; 
        self.storage[key] = storageObj;
        resolve();
    });
};

module.exports = Cache;
