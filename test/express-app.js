'use strict';

var express = require('express'),
    path = require('path');

function createExpressApp() {
    var app = express();

    app.set('views', path.join(__dirname, 'express-views'));
    app.set('view engine', 'hjs');

    return app;
}

module.exports = createExpressApp;