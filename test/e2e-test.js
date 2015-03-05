/* jshint node:true */
/* global describe, it, beforeEach, afterEach */

'use strict';

var assert = require('assert'),
    http = require('http'),
    ESI = require('../esi');

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
        
    })

});
