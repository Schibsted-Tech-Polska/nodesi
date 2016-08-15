'use strict';

const assert = require('assert');
const http = require('http');

const DataProvider = require('../lib/data-provider');

describe('Data Provider', () => {

    it('should be able to retrieve a value', done => {
        // given
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('stuff');
        });
        server.listen();

        const port = server.address().port;
        const dataProvider = new DataProvider({
            baseUrl: `http://localhost:${port}`
        });

        // when
        dataProvider.get('/')

            // then
            .then(result => {
                assert.equal(result.body, 'stuff');
                done();
            }).catch(done);
    });

    it('should by default ask for text/html', done => {
        // given
        const server = http.createServer((req, res) => {
            assert.equal(req.headers.accept, 'text/html, application/xhtml+xml, application/xml');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('stuff');
        });
        server.listen();

        const port = server.address().port;
        const dataProvider = new DataProvider({
            baseUrl: `http://localhost:${port}`
        });

        // when
        dataProvider.get('/')

            // then
            .then(() => {
                done();
            }).catch(done);
    });

    it('should not duplicate pending requests', done => {
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
            baseUrl: 'http://localhost:' + port
        });

        // when
        dataProvider.get('/');
        dataProvider.get('/');
        dataProvider.get('/');
        dataProvider.get('/')

            // then
            .then(result => {
                assert.equal(result.body, 'stuff');
                assert.equal(requestCount, 1);
                done();
            }).catch(done);
    });
});
