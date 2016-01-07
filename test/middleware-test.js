'use strict';

var assert = require('assert'),
    http = require('http'),
    goodGuy = require('good-guy-http'),
    middleware = require('../lib/middleware'),
    createExpressApp = require('./express-app');


describe('A express middleware', function () {

    var gg = null;
    var app = null;
    var server = null;
    var expressServer = null;
    var port = '';
    var expressPort = '';

    // setup express app, listening server and update port
    beforeEach(function () {
        gg = goodGuy();
        app = createExpressApp();
        expressServer = app.listen();
        expressPort = expressServer.address().port;

        server = new http.Server();
        server.listen();
        port = server.address().port;
    });

    afterEach(function () {
        gg = null;
        expressServer.close();
        expressServer = null;

        server.close();
        server = null;
    });

    it('should fetch external component with a middleware when render is called', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', function (req, res) {
            res.render('single-external-component', {
                port: port
            });
        });

        // when
        var req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(function (response) {
            assert.equal(response.body, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });


    it('should fetch external component with a middleware when send is called', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', function (req, res) {
            res.send('<section><esi:include src="http://localhost:' + port + '"></esi:include></section>');
        });

        // when
        var req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(function (response) {
            assert.equal(response.body, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should respect user defined callback in second parameter', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', function (req, res) {
            res.render('empty-section', function(err, str) {
                str = str.replace('</section>', '<div>test</div></section>');
                res.send(str);
            });
        });

        // when
        var req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(function (response) {
            assert.equal(response.body, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should respect user defined callback in third parameter', function (done) {

        // given
        server.addListener('request', function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', function (req, res) {
            res.render('single-external-component', {
                port: port
            }, function(err, str) {
                str = str.replace('test', 'teststuff');
                res.send(str);
            });
        });

        // when
        var req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(function (response) {
            assert.equal(response.body, '<section><div>teststuff</div></section>');
            done();
        }).catch(done);
    });

    it('should be configurable', function (done) {

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
        app.use(middleware({
            baseUrl: 'http://localhost:' + port
        }));
        app.get('/esi', function (req, res) {
            res.render('single-external-component-relative');
        });

        // when
        var req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(function (response) {
            assert.equal(response.body, '<div>test</div>');
            done();
        }).catch(done);
    });

});
