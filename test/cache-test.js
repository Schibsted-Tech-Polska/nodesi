/* jshint node:true */
/* global describe, it, beforeEach, afterEach */

'use strict';

var assert = require('assert'),
    Clock = require('./clock'),
    Cache = require('../lib/cache');

describe('Cache', function () {

    it('should be able to report unexpired value', function (done) {

        // given
        var cache = new Cache({
            clock: {}
        });

        // when
        cache.set('x', {
            value: 'y',
            expiresIn: 5
        });

        // then
        cache.get('x').then(function(result) {
            assert.equal(result.value, 'y');
            assert.ok(!result.expired);
            done();
        }).catch(done);

    });


    it('should be able to report expired value', function (done) {

        // given
        var clock = new Clock();
        var cache = new Cache({
            clock: clock
        });

        // when
        cache.set('x', {
            value: 'y',
            expiresIn: 4000
        });

        clock.tick(5000);

        // then
        cache.get('x').then(function(result) {
            assert.equal(result.value, 'y');
            assert.ok(result.expired);
            done();
        }).catch(done);

    });

});
