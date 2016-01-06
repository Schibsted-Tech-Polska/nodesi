'use strict';

var ESI = require('./esi');

function middleware(config) {
    var esi = new ESI(config);

    return function(req, res, next) {
        var oldRender = res.render.bind(res);

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
                esi.process(str).then(function(result) {
                    callback(null, result);
                }).catch(callback);
            });
        };

        next();
    };
}

module.exports = middleware;