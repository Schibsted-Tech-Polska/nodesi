//var assert = require('assert');
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
        var html = '<esi:include src="http://localhost:' + port + '"/>';

        // when
        var processed = new ESI().process(html);

        // then
        processed.then(function (response) {
            server.close();
            assert.equal(response, '<div>test</div>');
            done();
        }).catch(done);
    });

    // it("should fetch one relative component", function (done) {
    //     // given
    //     var server = http.createServer(function (req, res) {
    //         res.writeHead(200, { 'Content-Type': 'text/html' });
    //         res.end('<div>test</div>');
    //     }).listen();
    //     var port = server.address().port;
    //     var html = '<esi:include src="http://localhost:' + port + '"/>';

    //     // when
    //     var processed = esi.process(html);

    //     // then
    //     processed.then(function (response) {
    //         server.close();
    //         assert.equal(response, '<div>test</div>');
    //         done();
    //     }).catch(done);
    // });

});
