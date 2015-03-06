/* jshint node:true */
/* global describe, it, beforeEach, afterEach */

'use strict';

var assert = require('assert'),
    Esi = require('../lib/esi'),
    parse5 = require('parse5'),
    parser = new parse5.Parser(),
    serializer = new parse5.Serializer();

describe('ESI Tree processing', function() {

    it('should replace original node', function() {
        var replace = Esi.prototype.replace;
        var parsed = parser.parseFragment('<div><img/><img/></div>');
        var replacement = parser.parseFragment('<span>yyy</span>');

        replace(parsed.childNodes[0].childNodes[0], replacement);
        replace(parsed.childNodes[0].childNodes[1], replacement);

        assert.equal(serializer.serialize(parsed), '<div><span>yyy</span><span>yyy</span></div>');
    });

});
