'use strict';

// setup
const PORT = 3003;
const ADDRESS = 'http://localhost';
const ESI = require('./index');
const cp = require('child_process');
const fs = require('fs');
const express = require('express');

const app = express();
const esi = new ESI({
    baseUrl: ADDRESS + ':' + PORT
});
const perfESI = fs.readFileSync('./perf/esi.html').toString();
const perfReplacement1 = fs.readFileSync('./perf/replacement1.html').toString();
const perfReplacement2 = fs.readFileSync('./perf/replacement2.html').toString();
const perfReplacement3 = fs.readFileSync('./perf/replacement3.html').toString();

let perfRunner;
let perfRunnerArgs;

function spawn(proc, args, options) {
    if(process.platform === 'win32') {
        return cp.spawn(process.env.comspec, ['/c'].concat(proc).concat(args), options);
    } else {
        return cp.spawn(proc, args, options);
    }
}

try {
    perfRunnerArgs = JSON.parse(process.env.npm_config_argv).original.slice(2);
}
catch(e) {
    perfRunnerArgs = process.argv.slice(2);
}

// routes
app.get('/noop', (req, res) => {
    res.send(perfESI);
});

app.get('/test', (req, res) => {
    esi.process(perfESI).then(res.send.bind(res));
});

app.get('/test1', (req, res) => {
    res.send(perfReplacement1);
});

app.get('/test2', (req, res) => {
    res.send(perfReplacement2);
});

app.get('/test3', (req, res) => {
    res.send(perfReplacement3);
});


// bootstrap
app.listen(PORT, () => {
    console.log('Performance test server listening at ' + ADDRESS + ':' + PORT);
    console.log('Execute `npm run perf /test` or `npm run perf /noop` to run the performance test.');

    perfRunner = spawn('autocannon', perfRunnerArgs, {
        stdio: 'inherit',
        env: {
            ...process.env,
            PORT,
        },
    });
    perfRunner.on('exit', () => {
        process.nextTick(process.exit);
    });
});