/* jshint node:true */
/* global describe, it, beforeEach, afterEach */

'use strict';

var assert = require('assert'),
    http = require('http'),
    ESI = require('../esi'),
    Cache = require('../cache');

describe('ESI processor', function () {

    var server = null;
    var port = '';

    // setup listening server and update port
    beforeEach(function() {
        server = new http.Server();
        server.listen();
        port = server.address().port;
    });

    afterEach(function() {
        server.close();
        server = null;
    });


    it('should fetch one external component', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        });

        var html = '<body><esi:include src="http://localhost:' + port + '"></esi:include></body>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<body><div>test</div></body>');
            done();
        }).catch(done);

    });

    it('should fetch one relative component', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if(req.url === '/header') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include>';

        // when
        var processed = new ESI({
            basePath: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);

    });


    it('should fetch one relative component (no leading slash)', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if(req.url === '/header') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('not found');
            }
        });

        var html = '<esi:include src="header"></esi:include>';

        // when
        var processed = new ESI({
            basePath: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);

    });


    it('should fetch multiple components', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if(req.url === '/header') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<div>test header</div>');
            } else if(req.url === '/footer') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<div>test footer</div>');
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include><esi:include src="/footer"></esi:include>';

        // when
        var processed = new ESI({
            basePath: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<div>test header</div><div>test footer</div>');
            done();
        }).catch(done);

    });

    it('should handle immediately closed html tags', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if(req.url === '/header') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<section></section><div>something</div>');
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include>';

        // when
        var processed = new ESI({
            basePath: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section></section><div>something</div>');
            done();
        }).catch(done);

    });

    it('should gracefully degrade to empty content on error', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end();
        });

        var html = '<esi:include src="/error"></esi:include>';

        // when
        var processed = new ESI({
            basePath: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '');
            done();
        }).catch(done);
        
    });

    it('should gracefully degrade to empty content on timeout', function (done) {
        
        // given
        server.addListener('request', function (req, res) {
            setTimeout(function() {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('this should not happen');
            }, 10);
        });

        var html = '<esi:include src="/error"></esi:include>';

        // when
        var processed = new ESI({
            basePath: 'http://localhost:' + port,
            defaultTimeout: 1
        }).process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '');
            done();
        }).catch(done);

    });

    it('should populate internal cache after first successful request', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('hello');
        });

        var html = '<esi:include src="/cacheme"></esi:include>';

        // when
        var esi = new ESI({
            basePath: 'http://localhost:' + port,
            cache: new Cache()
        });

        var processed = esi.process(html);

        // then
        processed.then(function (response) {
            return esi.cache.get('http://localhost:' + port + '/cacheme');
        }).then(function (cached) {
            assert.equal(cached.value, 'hello');
            done();
        }).catch(done);

    });

    it('should return data from the cache', function (done) {

        // when
        var html = '<esi:include src="/cacheme"></esi:include>';
        var cache = new Cache();
        cache.set('http://example.com/cacheme', {
            value: 'stuff'
        });
        var esi = new ESI({
            basePath: 'http://example.com',
            cache: cache
        });

        var processed = esi.process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, 'stuff');
            done();
        }).catch(done);

    });

    it('should respect cache-control headers', function (done) {
        
        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age: 1'
            });
            res.end('hello');
        });
        var html = '<esi:include src="/cacheme"></esi:include>';
        var cache = new Cache();
        cache.set('http://example.com/cacheme', {
            value: 'stuff'
        });
        var esi = new ESI({
            basePath: 'http://example.com',
            cache: cache
        });

        var processed = esi.process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, 'stuff');
            done();
        }).catch(done);
    });

});
