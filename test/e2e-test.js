var assert = require('assert');
var http = require('http');
var ESI = require('../esi');

describe("ESI processor", function () {

    it("should fetch one external component", function (done) {
        // given
        var server = http.createServer(function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        }).listen();
        var port = server.address().port;
        var html = '<body><esi:include src="http://localhost:' + port + '"/></body>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            server.close();
            assert.equal(response, '<body><div>test</div></body>');
            done();
        }).catch(done);
    });

    it("should fetch one relative component", function (done) {
        // given
        var server = http.createServer(function (req, res) {
            if(req.url === '/header') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('not found');
            }
        }).listen();
        var port = server.address().port;
        var html = '<esi:include src="/header"/>';

        // when
        var processed = new ESI({
            basePath: 'http://localhost:' + port
        }).process(html);

        // then
        processed.then(function (response) {
            server.close();
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);
    });

});
