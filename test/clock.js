function Clock() {
    this.time = Date.now();
}

Clock.prototype.now = function() {
    return this.time;
};

Clock.prototype.tick = function(amount) {
    this.time += amount;
};


module.exports = Clock;