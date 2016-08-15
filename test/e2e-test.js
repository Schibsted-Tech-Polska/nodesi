'use strict';

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const goodGuyLib = require('good-guy-http');
const events = require('events');
const Clock = require('./clock');

const ESI = require('../lib/esi');
const DataProvider = require('../lib/data-provider');

describe('ESI processor', () => {
    let server = null;
    let port = '';

    // setup listening server and update port
    beforeEach(() => {
        server = new http.Server();
        server.listen();
        port = server.address().port;
    });

    afterEach(() => {
        server.close();
        server = null;
    });


    it('should fetch one external component', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        const html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';

        // when
        const processed = ESI().process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should fetch one external component with single quoted src', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        const html = "<section><esi:include src='http://localhost:" + port + "'></esi:include></section>";

        // when
        const processed = ESI().process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should fetch one external component with unquoted src', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        const html = '<section><esi:include src=http://localhost:' + port + '></esi:include></section>';

        // when
        const processed = ESI().process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should fetch one self-closed external component', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        const html = '<section><esi:include src="http://localhost:' + port + '"/></section>';

        // when
        const processed = ESI().process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should handle self-closing tags in html', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<div>test</div>');
        });

        const html = '<section><esi:include src="http://localhost:' + port + '"></esi:include><img src="some-image" /></section>';

        // when
        const processed = ESI().process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<section><div>test</div><img src="some-image" /></section>');
            done();
        }).catch(done);
    });

    it('should fetch one relative component', done => {
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

        const html = '<esi:include src="/header"></esi:include>';

        // when
        const processed = ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);
    });


    it('should fetch one relative component (no leading slash)', done => {
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

        const html = '<esi:include src="header"></esi:include>';

        // when
        const processed = ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);
    });


    it('should fetch multiple components', done => {
        // given
        server.addListener('request', (req, res) => {
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

        const html = '<esi:include src="/header"></esi:include><esi:include src="/footer"></esi:include>';

        // when
        const processed = ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<div>test header</div><div>test footer</div>');
            done();
        }).catch(done);
    });

    it('should handle immediately closed html tags', done => {
        // given
        server.addListener('request', (req, res) => {
            if (req.url === '/header') {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<section></section><div>something</div>');
            } else {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end('not found');
            }
        });

        const html = '<esi:include src="/header"></esi:include>';

        // when
        const processed = ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<section></section><div>something</div>');
            done();
        }).catch(done);
    });

    it('should gracefully degrade to empty content on error', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end();
        });

        const html = '<esi:include src="/error"></esi:include>';

        // when
        const processed = ESI({
            baseUrl: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(response => {
            assert.equal(response, '');
            done();
        }).catch(done);
    });

    it('should execute optional callback on error', done => {
        // given
        let assertionCount = 0;
        server.addListener('request', (req, res) => {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end();
        });

        const html = '<esi:include src="/error"></esi:include>';

        // when
        const processed = ESI({
            baseUrl: 'http://localhost:' + port,
            onError: (src, error) => {
                assertionCount += 2;
                assert.equal(error.message, 'HTTP error: status code 500');
                assert.equal(src, 'http://localhost:' + port + '/error');
                return '<div>something went wrong</div>';
            }
        }).process(html);

        // then
        processed.then(response => {
            assertionCount++;
            assert.equal(response, '<div>something went wrong</div>');
            assert.equal(assertionCount, 3);
            done();
        }).catch(done);
    });

    it('should gracefully degrade to empty content on timeout', done => {
        // given
        server.addListener('request', (req, res) => {
            setTimeout(() => {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('this should not happen');
            }, 10);
        });

        const html = '<esi:include src="/error"></esi:include>';

        // when
        const processed = ESI({
            baseUrl: 'http://localhost:' + port,
            httpClient: goodGuyLib({
                timeout: 1
            })
        }).process(html);

        // then
        processed.then(response => {
            assert.equal(response, '');
            done();
        }).catch(done);
    });

    it('should allow to disable cache', done => {
        // given
        let connectionCount = 0;
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            if(connectionCount === 0) {
                res.end('hello');
            }
            else {
                res.end('world');
            }
            connectionCount++;
        });

        const html = '<esi:include src="/cacheme"></esi:include>';

        // when
        const esi = ESI({
            baseUrl: 'http://localhost:' + port,
            cache: false
        });

        const processed = esi.process(html);

        // then
        processed.then(response => {
            return esi.process(html);
        }).then(response => {
            assert.equal(response, 'world');
            done();
        }).catch(done);
    });

    it('should fetch components recursively', done => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            if (req.url === '/first') {
                res.end('<esi:include src="http://localhost:' + port + '/second"></esi:include>');
            } else if (req.url === '/second') {
                res.end('<esi:include src="http://localhost:' + port + '/third"></esi:include>');
            } else {
                res.end('<div>test</div>');
            }

        });

        const html = '<section><esi:include src="http://localhost:' + port + '/first"></esi:include></section>';

        // when
        const processed = ESI().process(html);

        // then
        processed.then(response => {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should set max fetch limit for recursive components', done => {
       // given
       server.addListener('request', (req, res) => {
           res.writeHead(200, {'Content-Type': 'text/html'});
           res.end('<esi:include src="http://localhost:' + port + '"></esi:include>');
       });
    
       const html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';
    
       // when
       const processed = ESI({
           maxDepth: 5
       }).process(html);
    
       // then
       processed.then(response => {
           assert.equal(response, '<section></section>');
           done();
       }).catch(done);
    });

    it('should pass specified headers to server', done => {
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

        const html = '<section><esi:include src="http://localhost:' + port + '"></esi:include></section>';

        // when
        const processed = ESI().process(html, {
            headers: {
                'x-custom-header': 'blah'
            }
        });

        // then
        processed.then(response => {
            assert.equal(response, '<section><div>test</div></section>');
            done();
        }).catch(done);
    });

    it('should be able to use custom log output', done => {
        // given
        const esi  = ESI({
            logTo: {
                write: log => {
                    // then
                    assert.equal(log, 'test');
                    done();
                }
            }
        });

        // when
        esi.logger.write('test');
    });

    it('should be able to log output to a file', done => {
        // given
        const PATH = './test/logger-test-output.txt';
        const stream = fs.createWriteStream(PATH);
        const testStr = '' + Math.random();
        const esi  = ESI({
            logTo: stream
        });

        // when
        esi.logger.write(testStr);

        // then
        fs.readFile(PATH, (err, contents) => {
            if(err) {
                done(err);
            } else {
                assert.equal(contents, testStr);
                fs.unlink(PATH, done);
            }
        });
    });
});
