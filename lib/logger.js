/* jshint node:true */
/* global Promise */

'use strict';

function Logger(config) {
    config = config || {};

    if(typeof config.logTo === 'object') {
        if(typeof config.logTo.write !== 'function') {
            throw new Error('logTo is supposed to be an object with write method on it');
        }
        this.output = config.logTo;
    } else {
        this.output = { write: function() {  } };
    }
}

Logger.prototype.write = function(log) {
    this.output.write(log);
};

module.exports = Logger;
