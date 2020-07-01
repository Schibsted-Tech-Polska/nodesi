'use strict';

const AllowedHosts = require('./allowed-hosts');
const DataProvider = require('./data-provider');
const Logger = require('./logger');
const { decode } = require('he');

function ESI(config) {
    config = config || {};

    const maxDepth = config.maxDepth || 3;
    const onError = config.onError || (() => {});
    const dataProvider = config.dataProvider || new DataProvider(config);
    const logger = new Logger(config);
    const allowedHosts = (config.allowedHosts && !Array.isArray(config.allowedHosts)) ?
        config.allowedHosts : new AllowedHosts(config, logger);

    function processHtmlText(html, options, state) {
        options = options || {};

        state = state || {};
        state.currentDepth = state.currentDepth || 0;
        const subtasks = [];
        const maxDepthReached = state.currentDepth > maxDepth;

        // in current module, esi:remove are simply removed
        html =  handleESIRemove(html);

        let i = 0;
        const tags = findESIIncludeTags(html);
        if (!tags.length) {
            return Promise.resolve(html);
        }
        tags.forEach(tag => {
            const placeholder = '<!-- esi-placeholder-' + i + ' -->';

            if(maxDepthReached) {
                html = html.replace(tag, '');
            } else if(tag.includes('<esi:include')) {
                html = html.replace(tag, placeholder);
                subtasks[i] = getIncludeContents(tag, options)
                    .then(result => html = html.replace(placeholder, result));
                i++;
            }
        });

        return Promise.all(subtasks)
            .then(() => {
                if(hasESITag(html)) {
                    state.currentDepth++;
                    return processHtmlText(html, options, state);
                }
                return html;
            });
    }

    function process(html, options) {
        return processHtmlText(html, options);
    }

    function hasESITag(html) {
        return html.match(/<esi:include.*?(?:\/\s*>|<\/esi:include>)/gms)
    }

    function findESIIncludeTags(html) {        
        const re = /<esi:include.*?(?:\/\s*>|<\/esi:include>)/gms;
        const tags = [];
        let match;
        while ((match = re.exec(html)) !== null) {
            tags.push(match[0]);        
        }
        return tags;
    }

    function handleESIRemove(html) {
        const re = /<esi:remove>([\s\S]*?)<\/esi:remove>/gms;
        return html.replace(re, '');
    }

    function getIncludeContents(tag, options) {
        const src = getDoubleQuotedSrc(tag) || getSingleQuotedSrc(tag) || getUnquotedSrc(tag);
        const alt = getDoubleQuotedAlt(tag) || getSingleQuotedAlt(tag) || getUnquotedAlt(tag);
        return get([src, alt], options);
    }

    function getBoundedString(open, close) {
        return str => {
            const before = str.indexOf(open);
            let strFragment;
            let after;

            if(before > -1) {
                strFragment = str.substr(before + open.length);
                after = strFragment.indexOf(close);
                return strFragment.substr(0, after);
            }
            return '';
        };
    }

    const getDoubleQuotedSrc = getBoundedString('src="', '"');
    const getSingleQuotedSrc = getBoundedString("src='", "'");
    const getUnquotedSrc = getBoundedString('src=', '>');

    const getDoubleQuotedAlt = getBoundedString('alt="', '"');
    const getSingleQuotedAlt = getBoundedString("alt='", "'");
    const getUnquotedAlt = getBoundedString('alt=', '>');

    function get([src, alt], options) {
        src = decode(src);
        src = dataProvider.toFullyQualifiedURL(src, options);

        return Promise.resolve()
            .then(() => {
                if(!allowedHosts.includes(src)) {
                    const err = new Error(`${src} is not included in allowedHosts or baseUrl.`);
                    err.blocked = true;
                    throw err;
                }
            })
            .then(() => dataProvider.get(src, options))
            .then(result => result.body)
            .catch(error => alt ? get([alt], options) : handleError(src, error));
    }

    function handleError(src, error) {
        const handlerResult = onError(src, error);

        if (typeof handlerResult === 'string') return handlerResult;
        return '';
    }

    return {process, handleError, logger, findESIIncludeTags};
}

ESI.DataProvider = DataProvider;
ESI.Logger = Logger;

module.exports = ESI;
