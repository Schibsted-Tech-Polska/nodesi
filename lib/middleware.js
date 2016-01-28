'use strict';

var ESI = require('./esi');

function middleware(config) {
    var esi = new ESI(config);

    return function(req, res, next) {
        var oldRender = res.render.bind(res);
        var oldSend = res.send.bind(res);

        res.render = function(view, options, callback) {
            // arguments juggle to support express render signature
            if(typeof options === 'function') {
                callback = options;
                options = {};
            }
            if(typeof callback !== 'function') {
                callback = function(err, str) {
                    if(err) return req.next(err);
                    res.send(str);
                };
            }

            // inject esi processing in between of rendering a template
            // and calling the send callback
            oldRender(view, options, function(err, str) {
                if(err) return callback(err);
                esi.process(str, req.esiOptions).then(function(result) {
                    req._esiProcessed = true;
                    callback(null, result);
                }).catch(callback);
            });
        };

        res.send = function(body) {
            if(typeof body === 'string' && !req._esiProcessed) {
                esi.process(body).then(oldSend);
            }
            else {
                oldSend(body);
            }
            return this;
        };

        next();
    };
}

module.exports = middleware;