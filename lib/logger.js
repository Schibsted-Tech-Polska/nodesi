'use strict';

module.exports = function Logger(config) {
    config = config || {};
    let output;

    if(typeof config.logTo === 'object') {
        if(typeof config.logTo.write !== 'function') {
            throw new Error('logTo is supposed to be an object with write method on it');
        }
        output = config.logTo;
    } else {
        output = { write: function() {  } };
    }

    function write(log) {
        return output.write(log);
    }

    return {write};
};
