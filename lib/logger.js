/* jshint node:true */
/* global Promise */

'use strict';

function Logger(config) {
    config = config || {};

    this.output = config.logTo || function() { };
}

Logger.prototype.write = function(log) {
    this.output(log);
};

module.exports = Logger;
