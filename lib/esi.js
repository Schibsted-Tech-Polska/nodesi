'use strict';

const DataProvider = require('./data-provider');
const Logger = require('./logger');

function ESI(config) {
    config = config || {};

    const maxDepth = config.maxDepth || 3;
    const onError = config.onError || (() => {});
    const dataProvider = config.dataProvider || new DataProvider(config);
    const logger = new Logger(config);

    function processHtmlText(html, options, state) {
        options = options || {};

        state = state || {};
        state.currentDepth = state.currentDepth || 0;
        const subtasks = [];
        const maxDepthReached = state.currentDepth > maxDepth;

        let i = 0;
        findESIInclueTags(html, options)
            .forEach(tag => {
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
        return html.includes('<esi:');
    }

    function findESIInclueTags(html) {
        const open = '<esi:include';
        const fullClose = '</esi:include>';
        const selfClose = '/>';
        const tags = [];
        let nextTagOpen;
        let nextTagFullClose;
        let nextTagSelfClose;
        let reducedHtml = html;

        do {
            nextTagOpen = reducedHtml.indexOf(open);
            if(nextTagOpen > -1) {
                reducedHtml = reducedHtml.substr(nextTagOpen);
                nextTagFullClose = reducedHtml.indexOf(fullClose);
                nextTagSelfClose = reducedHtml.indexOf(selfClose);

                if(nextTagFullClose > -1 &&
                    (Math.max(0, nextTagFullClose - fullClose.length) < Math.max(0, nextTagSelfClose - selfClose.length)) ||
                    nextTagSelfClose === -1) {
                    tags.push(reducedHtml.substr(0, nextTagFullClose + fullClose.length));
                    reducedHtml = reducedHtml.substr(nextTagFullClose + fullClose.length);
                } else {
                    tags.push(reducedHtml.substr(0, nextTagSelfClose + selfClose.length));
                    reducedHtml = reducedHtml.substr(nextTagSelfClose + selfClose.length);
                }
            }
        } while(nextTagOpen > -1);

        return tags;
    }

    function getIncludeContents(tag, options) {
        const src = getDoubleQuotedSrc(tag) || getSingleQuotedSrc(tag) || getUnquotedSrc(tag);
        return get(src, options);
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

    function get(src, options) {
        src = dataProvider.toFullyQualifiedURL(src);

        return dataProvider.get(src, options)
            .then(result => result.body)
            .catch(error => handleError(src, error));
    }

    function handleError(src, error) {
        const handlerResult = onError(src, error);

        if (typeof handlerResult === 'string') return handlerResult;
        return '';
    }

    return {process, handleError, logger};
}

ESI.DataProvider = DataProvider;
ESI.Logger = Logger;

module.exports = ESI;