'use strict';

const assert = require('assert');
const http = require('http');
const goodGuy = require('good-guy-http');
const middleware = require('../lib/middleware');
const createExpressApp = require('./express-app');


describe('A express middleware', () => {

    let gg = null;
    let app = null;
    let server = null;
    let expressServer = null;
    let port = '';
    let expressPort = '';

    // setup express app, listening server and update port
    beforeEach(() => {
        gg = goodGuy();
        app = createExpressApp();
        expressServer = app.listen();
        expressPort = expressServer.address().port;

        server = new http.Server();
        server.listen();
        port = server.address().port;
    });

    afterEach(() => {
        gg = null;
        expressServer.close();
        expressServer = null;

        server.close();
        server = null;
    });

    it('should fetch external component with a middleware when render is called', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.render('single-external-component', {
                port: port
            });
        });

        // when
        const req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(response => {
            assert.equal(response.body, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });


    it('should fetch external component with a middleware when send is called', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.send('<section><esi:include src="http://localhost:' + port + '"></esi:include></section>');
        });

        // when
        const req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(response => {
            assert.equal(response.body, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should respect user defined callback in second parameter', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.render('empty-section', (err, str) => {
                str = str.replace('</section>', '<div>test</div></section>');
                res.send(str);
            });
        });

        // when
        const req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(response => {
            assert.equal(response.body, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should respect user defined callback in third parameter', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.render('single-external-component', {
                port: port
            }, (err, str) => {
                str = str.replace('test', 'teststuff');
                res.send(str);
            });
        });

        // when
        const req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(response => {
            assert.equal(response.body, '<section><div>teststuff</div></section>');
            done();
        }).catch(done);
    });

    it('should be configurable', done => {
        // given
        server.addListener('request', (req, res) => {
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
        app.get('/esi', (req, res) => {
            res.render('single-external-component-relative');
        });

        // when
        const req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(response => {
            assert.equal(response.body, '<div>test</div>');
            done();
        }).catch(done);
    });

    it('should pass headers', done => {
        // given
        server.addListener('request', (req, res) => {
            if (req.headers['x-custom-header']) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<div>test</div>');
            }
            else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('you should not get this');
            }
        });
        app.use(middleware({
            baseUrl: 'http://localhost:' + port
        }));
        app.get('/esi', (req, res) => {
            req.esiOptions = {
                headers: {
                    'x-custom-header': 'blah'
                }
            };
            res.render('single-external-component-relative');
        });

        // when
        const req = gg.get('http://localhost:' + expressPort + '/esi');

        // then
        req.then(response => {
            assert.equal(response.body, '<div>test</div>');
            done();
        }).catch(done);
    })

});
