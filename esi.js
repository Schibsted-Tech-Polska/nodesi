var Q = require('q');
var cheerio = require("cheerio");

exports.process = function(html) {
    var deferred = Q.defer();

    var $ = cheerio.load(html);
    var sources = $('esi\\:include').map(function() {
        return $(this).attr('src');
    }).get();
    console.log(sources);

    deferred.resolve('<div>test</div>');
    return deferred.promise;
}