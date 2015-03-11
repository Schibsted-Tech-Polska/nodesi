/* jshint node:true */

'use strict';

var PORT = 3003,
    ADDRESS = 'http://localhost',

    ESI = require('./index'),
    cp = require('child_process'),
    express = require('express'),

    app = express(),
    esi = new ESI({
        baseUrl: ADDRESS + ':' + PORT
    }),
    siege,
    server,

    spawn = function(proc, args, options) {
        if(process.platform === 'win32') {
            return cp.spawn(process.env.comspec, ['/c'].concat(proc).concat(args), options);
        } else {
            return cp.spawn(proc, args, options);
        }
    };

app.get('/test', function(req, res) {
    esi.process('<section><esi:include src="/test2"></esi:include></section>').then(res.send.bind(res));
});

app.get('/test2', function(req, res) {
    res.send('<div>hello</div>');
});

app.listen(PORT, function() {
    console.log('Performance test server listening at ' + ADDRESS + ':' + PORT + '/test');

    siege = spawn('siege', ['-b', '-t5s', ADDRESS + ':' + PORT + '/test'], {
        stdio: 'inherit'
    });
    siege.on('exit', function() {
        process.nextTick(process.exit);
    });
});
