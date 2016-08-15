'use strict';

const ESI = require('./esi');

module.exports = function middleware(config) {
    const esi = ESI(config);

    return (req, res, next) => {
        const oldRender = res.render.bind(res);
        const oldSend = res.send.bind(res);

        res.render = (view, options, callback) => {
            // arguments juggle to support express render signature
            if(typeof options === 'function') {
                callback = options;
                options = {};
            }
            if(typeof callback !== 'function') {
                callback = (err, str) => {
                    if(err) return req.next(err);
                    res.send(str);
                };
            }

            // inject esi processing in between of rendering a template
            // and calling the send callback
            oldRender(view, options, (err, str) => {
                if(err) return callback(err);
                esi.process(str, req.esiOptions).then(result => {
                    req._esiProcessed = true;
                    callback(null, result);
                }).catch(callback);
            });
        };

        res.send = body => {
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
};
