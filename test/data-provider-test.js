'use strict';

const assert = require('assert');
const http = require('http');

const DataProvider = require('../lib/data-provider');

describe('Data Provider', () => {
    it('should be able to retrieve a value', (done) => {
        // given
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('stuff');
        });
        server.listen();

        const port = server.address().port;
        const dataProvider = new DataProvider({
            baseUrl: `http://localhost:${port}`,
        });

        // when
        dataProvider
            .get('/')

            // then
            .then((result) => {
                assert.equal(result, 'stuff');
                done();
            })
            .catch(done);
    });

    it('should by default ask for text/html', (done) => {
        // given
        const server = http.createServer((req, res) => {
            assert.equal(
                req.headers.accept,
                'text/html, application/xhtml+xml, application/xml'
            );
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('stuff');
        });
        server.listen();

        const port = server.address().port;
        const dataProvider = new DataProvider({
            baseUrl: `http://localhost:${port}`,
        });

        // when
        dataProvider
            .get('/')

            // then
            .then(() => {
                done();
            })
            .catch(done);
    });

    it('should not duplicate pending requests', (done) => {
        // given
        let requestCount = 0;
        const server = http.createServer((req, res) => {
            requestCount++;
            setTimeout(() => {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('stuff');
            }, 1);
        });
        server.listen();

        const port = server.address().port;
        const dataProvider = new DataProvider({
            baseUrl: 'http://localhost:' + port,
        });

        // when
        dataProvider.get('/');
        dataProvider.get('/');
        dataProvider.get('/');
        dataProvider
            .get('/')

            // then
            .then((result) => {
                assert.equal(result, 'stuff');
                assert.equal(requestCount, 1);
                done();
            })
            .catch(done);
    });

    it('should not hang the next request when the previous fails', async () => {
        // given
        let requestCount = 0;
        const server = http.createServer((req, res) => {
            requestCount += 1;

            setTimeout(() => {
                if (requestCount === 1) {
                    res.writeHead(403, { 'Content-Type': 'text/html' });
                    res.end(`failing ${requestCount}`);
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`ok ${requestCount}`);
                }
            }, 1);
        });
        server.listen();

        const port = server.address().port;
        const dataProvider = new DataProvider({
            baseUrl: 'http://localhost:' + port,
        });

        // when
        await Promise.all([
            assert.rejects(dataProvider.get('/'), {
                name: 'Error',
                message: 'HTTP error 403: Forbidden',
            }),
            assert.rejects(dataProvider.get('/'), {
                name: 'Error',
                message: 'HTTP error 403: Forbidden',
            }),
        ]);

        // then
        const results = Promise.all([
            dataProvider.get('/'),
            dataProvider.get('/'),
        ]);

        await assert.doesNotReject(results);
        assert.deepEqual(await results, ['ok 2', 'ok 2']);
        assert.equal(requestCount, 2);
    });

    it('allows to configure custom user agent', (done) => {
        // given
        let calledUserAgent;
        const userAgent = 'my-custom-agent';
        const server = http.createServer((req, res) => {
            calledUserAgent = req.headers['user-agent'];
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('stuff');
        });
        server.listen();

        const port = server.address().port;
        const dataProvider = new DataProvider({
            baseUrl: `http://localhost:${port}`,
            userAgent,
        });

        // when
        dataProvider
            .get('/')

            // then
            .then((result) => {
                assert.equal(result, 'stuff');
                assert.equal(calledUserAgent, userAgent);
                done();
            })
            .catch(done);
    });

    it('should work with a custom http client that is fetch api compatible', (done) => {
        // given
        const baseUrl = 'http://example.com';
        let calledUrl;
        let calledOptions;

        const dataProvider = new DataProvider({
            baseUrl,
            httpClient: (url, options) => {
                calledUrl = url;
                calledOptions = options;

                return Promise.resolve({
                    text: () => Promise.resolve('custom response'),
                });
            },
        });

        // when
        dataProvider
            .get('/path', {
                headers: { custom: 'custom-header-value' },
                optionX: 'optionX',
            })

            // then
            .then((result) => {
                assert.equal(result, 'custom response');
                assert.equal(calledUrl, 'http://example.com/path');
                assert.deepEqual(calledOptions, {
                    headers: {
                        Accept: 'text/html, application/xhtml+xml, application/xml',
                        'user-agent': 'node-esi',
                        custom: 'custom-header-value',
                    },
                    optionX: 'optionX',
                });
                done();
            })
            .catch(done);
    });
});
