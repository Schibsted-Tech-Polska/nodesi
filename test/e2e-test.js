/* jshint node:true */
/* global describe, it, beforeEach, afterEach, Promise */

'use strict';

var assert = require('assert'),
    http = require('http'),

    Clock = require('./clock'),

    ESI = require('../lib/esi'),
    DataProvider = require('../lib/data-provider'),
    Cache = require('../lib/cache');

describe('ESI processor', function () {

    var server = null;
    var port = '';

    // setup listening server and update port
    beforeEach(function () {
        server = new http.Server();
        server.listen();
        port = server.address().port;
    });

    afterEach(function () {
        server.close();
        server = null;
    });


    it('should fetch one external component', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        var html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);

    });

    it('should fetch one relative component', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
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
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="header"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
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
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test header</div>');
            } else if (req.url === '/footer') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test footer</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include><esi:include src="/footer"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
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
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<section></section><div>something</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        var html = '<esi:include src="/header"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
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
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end();
        });

        var html = '<esi:include src="/error"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port
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
            setTimeout(function () {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('this should not happen');
            }, 10);
        });

        var html = '<esi:include src="/error"></esi:include>';

        // when
        var processed = new ESI({
            baseUrl: 'http://localhost:' + port,
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
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('hello');
        });

        var html = '<esi:include src="/cacheme"></esi:include>';

        // when
        var esi = new ESI({
            baseUrl: 'http://localhost:' + port
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

        // given
        var cache = new Cache();

        // when
        var html = '<esi:include src="/cacheme"></esi:include>';
        cache.set('http://example.com/cacheme', {
            value: 'stuff'
        });
        var esi = new ESI({
            baseUrl: 'http://example.com',
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
        var responseCount = 0;

        function body() {
            if (responseCount === 0) {
                responseCount++;
                return 'hello';
            } else {
                return 'world';
            }
        }

        var clock = new Clock();
        var cache = new Cache({
            clock: clock
        });
        var dataProvider = new DataProvider({
            baseUrl: 'http://localhost:' + port,
        });
        dataProvider.get = function (src) {
            return new Promise(function (resolve, reject) {
                resolve({
                    body: body(),
                    response: {
                        headers: {
                            'cache-control': 'public, max-age=1'
                        }
                    }
                });
            });
        };

        // when
        var html = '<esi:include src="/cacheme"></esi:include>';
        var esi = new ESI({
            cache: cache,
            dataProvider: dataProvider
        });

        var processed = esi.process(html);


        // then
        processed.then(function (response) {
            assert.equal(response, 'hello');
            clock.tick(2000);
            return esi.process(html);
        }).then(function (response) {
            assert.equal(response, 'hello');
            return esi.process(html);
        }).then(function (response) {
            assert.equal(response, 'world');
            done();
        }).catch(done);

    });

    it('should return last successfuly cached item upon server error', function (done) {

        // given
        var clock = new Clock();
        var cache = new Cache({
            clock: clock
        });
        var dataProvider = new DataProvider({
            baseUrl: 'http://example.com'
        });
        dataProvider.get = function () {
            return new Promise(function (resolve, reject) {
                reject();
            });
        };

        // when
        var html = '<esi:include src="/cacheme"></esi:include>';
        cache.set('http://example.com/cacheme', {
            value: 'stuff',
            expiresIn: 1
        });

        clock.tick(2000);

        var esi = new ESI({
            cache: cache,
            dataProvider: dataProvider
        });

        var processed = esi.process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, 'stuff');
            return esi.process(html);
        }).then(function (response) {
            assert.equal(response, 'stuff');
            done();
        }).catch(done);

    });

    it('should fetch components recursively', function (done) {
        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            if (req.url === '/first') {
                res.end('<esi:include src="http://localhost:' + port + '/second"></esi:include>');
            } else if (req.url == '/second') {
                res.end('<esi:include src="http://localhost:' + port + '/third"></esi:include>');
            } else {
                res.end('<div>test</div>');
            }

        });

        var html = '<section><esi:include src="http://localhost:' + port + '/first"></esi:include></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should set max fetch limit for recursive components', function (done) {
        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<esi:include src="http://localhost:' + port + '"></esi:include>')
        });

        var html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            assert.equal(response, '<section></section>');
            done();
        }).catch(done);
    });

    it('should pass specified headers to server', function (done) {

        // given
        server.addListener('request', function (req, res) {
            if (req.headers['x-custom-header']) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test</div>');
            }
            else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('you should not get this');
            }
        });

        var html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';

        // when
        var processed = new ESI().process(html, {
            headers: {
                'x-custom-header': 'blah'
            }
        });

        // then
        processed.then(function (response) {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);

    });

});
