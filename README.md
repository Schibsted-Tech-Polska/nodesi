## Performance testing

You can run performance tests with ```npm run perf [args]```

This tool assumes you have [Siege](http://www.joedog.org/siege-home/) installed and added to your Path variable.

[args] are list of arguments that will be passed to Siege.

## Logging

It's a common anti-pattern that libraries write to stdout w/o users permission. 

We want to be nice so you can provide your own logging output with ```logTo``` configuration option. 

It's expected to be an object with "write" method on it that accepts a single string.


#### Examples

Logging to a custom object
```javascript
    new ESI({
        logTo: {
            write: function(log) {
                // do some stuff with log string here
            }
        }
    });
```

Logging to a standard output (same as console.log):
```javascript
    new ESI({
        logTo: process.stdout
    });
```

Logging to a file (possible, but please don't do that - http://12factor.net/logs):
```javascript
    var logFile = require('fs').createWriteStream('./log.txt');
    new ESI({
        logTo: logFile
    });
```