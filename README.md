## Logging

You can provide your own logging output with ```logTo``` configuration option.
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

Logging to a file:
```javascript
    var logFile = require('fs').createReadStream('./log.txt');
    new ESI({
        logTo: logFile
    });
```
