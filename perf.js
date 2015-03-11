/* jshint node:true, camelcase:false */

'use strict';

// setup
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
    siegeArgs,

    spawn = function(proc, args, options) {
        if(process.platform === 'win32') {
            return cp.spawn(process.env.comspec, ['/c'].concat(proc).concat(args), options);
        } else {
            return cp.spawn(proc, args, options);
        }
    };

try {
    siegeArgs = JSON.parse(process.env.npm_config_argv).original.slice(2);
}
catch(e) {
    siegeArgs = process.argv.slice(2);
}


// routes
app.get('/test', function(req, res) {
    esi.process('<section><esi:include src="/test2"></esi:include></section>').then(res.send.bind(res));
});

app.get('/test2', function(req, res) {
    res.send('<div>hello</div>');
});


// bootstrap
app.listen(PORT, function() {
    console.log('Performance test server listening at ' + ADDRESS + ':' + PORT + '/test');

    siege = spawn('siege', siegeArgs.concat(ADDRESS + ':' + PORT + '/test'), {
        stdio: 'inherit'
    });
    siege.on('exit', function() {
        process.nextTick(process.exit);
    });
});
