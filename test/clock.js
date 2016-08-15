'use strict';

module.exports = function Clock() {
    let time = Date.now();

    function now() {
        return time;
    }

    function tick(amount) {
        time += amount;
    }

    return {now, tick};
};