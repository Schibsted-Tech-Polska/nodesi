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

function ESI(config) {
    config = config || {};
}

ESI.prototype.process = function(html) {
    return new Promise(function(resolve, reject) {
        var $ = cheerio.load(html);
        var sources = $('esi\\:include').map(function() {
            return $(this).attr('src');
        }).get();

        Promise.all(sources.map(get)).then(function(results) {
            resolve(results.join(''));
        });

    });
};

module.exports = ESI;
