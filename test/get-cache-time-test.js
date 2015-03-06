/* jshint node:true */
/* global describe, it, beforeEach, afterEach */

'use strict';

var assert = require('assert'),
    getCacheTime = require('../lib/get-cache-time');

describe('Cache control parser', function () {

    it('should handle no-cache', function () {
        assert.equal(getCacheTime('no-cache'), 0);
    });

    it('should handle max-age', function () {
        assert.equal(getCacheTime('max-age=10'), 10000);
        assert.equal(getCacheTime('public, max-age=10'), 10000);
    });

});
