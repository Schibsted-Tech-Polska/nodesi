var Q = require('q');

exports.process = function(html) {
    var deferred = Q.defer();
    deferred.resolve(html);
    return deferred.promise;
}