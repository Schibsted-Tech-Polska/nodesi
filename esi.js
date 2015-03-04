var Q = require('q');
var cheerio = require("cheerio");
var request = require('request');

var get = function(src) {
    return new Promise(function(resolve, reject) {
        request(src, function(error, response, body) {
            resolve(body);
        });
    });
};

var toFullyQualifiedURL = function(base, url) {
    if(url.indexOf('http') === 0) {
        return url;
    } else {
        return base + url;
    }
};

function ESI(config) {
    config = config || {};

    this.basePath = config.basePath || '';
}

ESI.prototype.process = function(html) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var $ = cheerio.load(html);
        var sources = $('esi\\:include').map(function() {
            return $(this).attr('src');
        }).get();

        sources = sources.map(toFullyQualifiedURL.bind(null, self.basePath));

        Promise.all(sources.map(get)).then(function(results) {
            resolve(results.join(''));
        });

    });
};

module.exports = ESI;
