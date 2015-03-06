/* jshint node:true */
/* global describe, it, beforeEach, afterEach */

'use strict';

var assert = require('assert'),
    http = require('http'),

    DataProvider = require('../lib/data-provider');

describe('Data Provider', function () {

    it('should be able to retrieve a value', function (done) {
        
        // given
        var server = http.createServer(function(req, res) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('stuff');
        });
        server.listen();

       var port = server.address().port;
       var dataProvider = new DataProvider({
           baseUrl: 'http://localhost:' + port
       });

       // when
       dataProvider.get('/')

       // then
       .then(function(result) {
           assert.equal(result.body, 'stuff');
           done();
       }).catch(done);

    });

});
