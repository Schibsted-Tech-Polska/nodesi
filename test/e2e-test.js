//var assert = require('assert');
var assert = require('assert');
var http = require('http');
var esi = require('../esi');

describe("ESI processor", function () {
    it("should fetch one external component", function (done) {
        // given
        var server = http.createServer(function(req, res) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        }).listen();
        var port = server.address().port;
        var html = '<esi:include src="http://localhost:'+port+'"/>';

        // when
        var processed = esi.process(html);

        // then
        processed.then(function(response) {
            console.log(response);
            server.close();
            assert.deepEqual('dsafdsaf', '<div>test</div>', 'xyz');
            done();
        })
        .catch(done);
    });

});
