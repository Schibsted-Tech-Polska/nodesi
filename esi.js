var Q = require('q');

exports.process = function(html) {
    var deferred = Q.defer();
    deferred.resolve('<div>test</div>');
    return deferred.promise;
}