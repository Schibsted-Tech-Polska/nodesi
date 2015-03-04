var Q = require('q');
var cheerio = require("cheerio");
var request = require('request');

var get = function(src) {
    console.log(src);
    return new Promise(function(resolve, reject) {
        console.log('making promise');
        request(src, function(error, response, body) {
            console.log('req ended');
            resolve(body);
        });
    });
};

exports.process = function(html) {
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
