'use strict';

const urlModule = require('url');
const Logger = require('./logger');

module.exports = function AllowedHosts(config = {}, logger) {
    logger = logger || new Logger(config);

    if(!Array.isArray(config.allowedHosts) && !config.baseUrl) {
        logger.write('NodESI warning: No allowedHosts and baseUrl specified. In some cases this may impair your security.\n' +
            'Please read the documentation at https://github.com/Schibsted-Tech-Polska/nodesi#security');

        // dummy implementation with no host validation    
        return {
            includes(url) {
                return true;
            }
        };
    }

    const allowedHosts = mergeHosts(config.allowedHosts, config.baseUrl);

    function toOrigin(url) {
        const parsed = urlModule.parse(url);
        return urlModule.format({
            protocol: parsed.protocol,
            host: parsed.host
        });
    }

    function mergeHosts(allowed = [], baseUrl = '') {
        if(!baseUrl) {
            return allowed;
        }
        return allowed.concat(toOrigin(baseUrl));
    }

    function includes(url) {
        const origin = toOrigin(url);
        return allowedHosts.some(allowedHost => {
            if(typeof allowedHost.test === 'function') {
                return allowedHost.test(origin);
            }
            return allowedHost === origin;
        });
    }

    return { includes };
};