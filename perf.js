/* jshint node:true */

'use strict';

var PORT = 3000,
    ADDRESS = 'http://localhost';

var ESI = require('./index'),
    express = require('express'),
    app = express(),
    
    esi = new ESI({
        baseUrl: ADDRESS + ':' + PORT
    });

app.get('/test', function(req, res) {
    esi.process('<section><esi:include src="/test2"></esi:include></section>').then(res.send.bind(res));
});

app.get('/test2', function(req, res) {
    res.send('<div>hello</div>');
});

app.listen(PORT);
console.log('Performance test server listening at ' + ADDRESS + ':' + PORT + '/test');
