'use strict';

const url = require('url');
const defaultHeaders = {
    Accept: 'text/html, application/xhtml+xml, application/xml',
};

module.exports = function DataProvider(config) {
    const pendingReqests = new Map();

    config = config || {};

    const baseUrl = config.baseUrl || '';
    const httpClient = config.httpClient || globalThis.fetch;

    function extendRequestOptions(src, baseOptions) {
        return [
            toFullyQualifiedURL(src, baseOptions),
            {
                ...baseOptions,
                headers: Object.assign({}, defaultHeaders, baseOptions.headers),
            },
        ];
    }

    function toFullyQualifiedURL(urlOrPath, baseOptions) {
        if (urlOrPath.indexOf('http') === 0) {
            return urlOrPath;
        }

        const base = baseOptions ? baseOptions.baseUrl || baseUrl : baseUrl;
        return url.resolve(base, urlOrPath);
    }

    function get(src, baseOptions) {
        const [resource, options] = extendRequestOptions(
            src,
            baseOptions || {}
        );

        if (pendingReqests.has(resource)) {
            return pendingReqests.get(resource);
        }

        pendingReqests.set(
            resource,
            httpClient(resource, options)
                .then((response) => {
                    if (response.status >= 400) {
                        throw new Error(
                            `HTTP error ${response.status}: ${response.statusText}`
                        );
                    }

                    return response.text();
                })
                .then((text) => {
                    pendingReqests.delete(resource);

                    return text;
                })
        );

        return pendingReqests.get(resource);
    }

    return { toFullyQualifiedURL, get };
};
