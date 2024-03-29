[![Tests](https://github.com/Schibsted-Tech-Polska/nodesi/actions/workflows/test.yml/badge.svg)](https://github.com/Schibsted-Tech-Polska/nodesi/actions/workflows/test.yml)
[![GitHub license](https://img.shields.io/github/license/Schibsted-Tech-Polska/nodesi.svg)](https://github.com/Schibsted-Tech-Polska/helix-cli/blob/nodesi/LICENSE.txt)

## What is this?

It's a subset of [Edge Side Include](http://www.akamai.com/html/support/esi.html) standard implemented with [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)-based interface.

## What problem does it solve?

Let's say you want to use ESI in your project, but also want to retain good developer experience.
Rather than having to configure [Varnish](https://varnish-cache.org/docs/3.0/tutorial/esi.html) or [Ngnix](https://www.nginx.com/blog/benefits-of-microcaching-nginx/) to take care of server-rendered ESI tags locally you can simply pass the server output through `esi.process` function right before pushing it out to the client.
```javascript
    const response = obtainServerResponseWithEsiTags();
    return Promise.resolve()
        .then(function() {
            if(process.env.NODE_ENV !== 'production') {
                return esi.process(response);
            }
            return response;
        });
```

It also improves code mobility - if for whatever reason you decide to move from ESI-enabled environment into one that doesn't support it (yet?), all you have to do is to process the response directly on the server. This module should be performant enough for that use case.

## Features

* Support for `<esi:include>` tags
  * support for `alt` as fallback URL 
* Out of the box Express support
* Custom logging
* Lots of good stuff like caching, retires, request collapsing and such provided by [Good Guy HTTP](https://github.com/Schibsted-Tech-Polska/good-guy-http)

…and more, take a look at test cases for complete list.

### Advanced ESI features

`nodesi` does not support the entire ESI spec, but aims to provide a usable subset. This includes, of course `<esi:include src="…">`, but also some more advanced features like:

#### Fallback URL with `alt`

```html
<esi:include src="http://example.com/1.html" alt="http://bak.example.com/2.html"/>
```

Will try to include `http://example.com/1.html` first, and if that fails, fall back to `http://bak.example.com/2.html`. If both requests fail, the standard error handling described below will kick in.


## Installation

```npm install nodesi```
   
## Usage

#### Basic:
```javascript
    const ESI = require('nodesi');

    const esi = new ESI({
        allowedHosts: ['http://full-resource-path']
    });
    esi.process('<esi:include src="http://full-resource-path/stuff.html" />').then(function(result) {
        // result is a fetched html
    });
```

#### As Express middleware:
```javascript
    const esiMiddleware = require('nodesi').middleware;
    const app = require('express')();

    // inject the middleware before your route handlers
    app.use(esiMiddleware());
```

All the ESI constructor options described below are also applicable for the middleware function.
Just pass them like that: `esiMiddleWare({baseUrl: ..., allowedHosts: [...]});`

If you'd like to pass options like headers to ESI middleware, use `req.esiOptions` object:
```javascript
...
    app.use(esiMiddleware());

    app.get('/example', function(req, res) {
        req.esiOptions = {
            headers: {
                'Authorization': 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=='
            }
        };
        res.render('example');
    });
```

If you'd like to adjust the baseUrl dynamically, use `req.esiOptions` object:
```javascript
...
    app.use(esiMiddleware());

    app.get('/example', function(req, res) {
        req.esiOptions = {
            baseUrl: req.url
        };
        res.render('example');
    });
```

#### With base URL for relative paths:
```javascript
    const ESI = require('nodesi');

    const esi = new ESI({
        baseUrl: 'http://full-resource-path'
    });
    esi.process('<esi:include src="/stuff.html" />').then(function(result) {
        // result is a fetched html
    });
```

#### With headers:
```javascript
    const ESI = require('nodesi');

    const esi = new ESI({
        baseUrl: 'http://full-resource-path'
    });
    esi.process('<esi:include src="/stuff.html" />', {
        headers: {
            'Authorization': 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=='
        }
    }).then(function(result) {
        // result is a fetched html
    });
```

#### With a custom HTTP client

By default, nodesi uses a native `fetch` to fetch the data.

It uses a limited set of features of the fetch API, so it's easy to provide
a custom fetch implementation.

The required subset of the fetch interface looks like this in TS types:

```ts
type Options = {
    headers: Record<string, string>; // HTTP request headers to be attached
    // plus any other custom options you set:
    //   * calling esi.process
    //   * adding req.esiOptions = { ... }
};

type Response = {
    status: number; // http status code: 200, 400, 500, etc
    statusText: string; // status description
    text: () => Promise<string>; // returns the fetched text content
};

// https://developer.mozilla.org/en-US/docs/Web/API/fetch
type FetchFunction = (resource: string, options: Options) => Promise<Response>;
```

```javascript
    const ESI = require('nodesi');

    const esi = new ESI({
        httpClient: (url, options) => {
            return Promise.resolve({
                status: 200,
                statusText: 'ok', // this is used only when status >= 400
                text: () => Promise.resolve('custom static response'),
            });
        },
    });
```

## Security

Since this module performs HTTP calls to external services, it is possible for a malicious agent to exploit that, especially if content of a <esi:include> tag can be provided by user.

In order to mitigate that risk you should use `allowedHosts` configuration option. It's supposed to be a list of trusted hosts (protocol + hostname + port), represented as strings or regular expressions.

#### Example:
```javascript
const esi = new ESI({
    allowedHosts: ['https://exact-host:3000', /^http(s)?:\/\/other-host$/]
});
```

If you're using `baseUrl` option then it's host will automatically be added to `allowedHosts`.

In case some url gets blocked you'll receive an error in your `onError` handler (see below) with `blocked` property set to `true`.

## Error handling

You can provide onError callback to a ESI constructor. It will recieve two arguments: source URL and error object.

It should return a string that will be put in place of errorous content.

#### Example
```javascript
    const esi = new ESI({
        onError: function(src, error) {
            if(error.statusCode === 404) {
                return 'Not found';
            }
            return '';
        }
    });
```

## Logging

It's a common anti-pattern that libraries write to stdout w/o users permission. 

We want to be nice so you can provide your own logging output with ```logTo``` configuration option. 

It's expected to be an object with "write" method on it that accepts a single string.


#### Examples

Logging to a custom object
```javascript
    const esi = new ESI({
        logTo: {
            write: function(log) {
                // do some stuff with log string here
            }
        }
    });
```

Logging to a standard output (same as console.log):
```javascript
    const esi = new ESI({
        logTo: process.stdout
    });
```

Logging to a file (possible, [but please don't do that](http://12factor.net/logs)):
```javascript
    const logFile = require('fs').createWriteStream('./log.txt');
    const esi = new ESI({
        logTo: logFile
    });
```

## Decoding of the ESI url

By default url passed as an argument in ESI tag gets decoded. 

You might want to not have it decoded from some purposes, so you can pass `decodeUrl: false` config item.

### Example

```javascript
    const ESI = require('nodesi');

    const esi = new ESI({
        baseUrl: 'https://example.com',
        decodeUrl: false,
    });
    esi.process('<esi:include src="/path?foo=bar&amp;baz=bat" />').then(function(result) {
        // result is a fetched content
        // when decodeUrl is set to false, https://example.com/path?foo=bar&amp;baz=bat will be fetched
        // when decodeUrl is set to true or not set, https://example.com/path?foo=bar&baz=bat will be fetched
    });
```

## Performance testing

You can run performance tests with `npm run perf /test`
and `npm run perf /noop` that will test the base performance of your system
without nodesi.

## License

`nodesi` is made available under the conditions of the [ISC license](LICENSE.txt)
