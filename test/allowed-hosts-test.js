'use strict';

const assert = require('assert');
const AllowedHosts = require('../lib/allowed-hosts');

describe('Allowed hosts checker', () => {

    it('should log appropriate message if allowed hosts are not possible to determine', done => {
        // given
        const logger = {
            write(log) {
                // then
                assert.ok(log.includes('No allowedHosts'));
                done();
            }
        };

        // when
        AllowedHosts({}, logger);
    });

    it('should approve all hosts if allowed hosts are not possible to determine', () => {
        // when
        const allowedHosts = AllowedHosts();

        // then
        assert.ok(allowedHosts.includes('anything'));
    });

    it('should include baseUrl in allowed hosts by default', () => {
        // when
        const allowedHosts = AllowedHosts({
            baseUrl: 'http://localhost'
        });

        // then
        assert.ok(allowedHosts.includes('http://localhost/whatever'));
        assert.ok(!allowedHosts.includes('anything'));
    });

    it('should take port and protocol into consideration', () => {
        // when
        const allowedHosts = AllowedHosts({
            baseUrl: 'http://localhost'
        });

        // then
        assert.ok(!allowedHosts.includes('https://localhost'));
        assert.ok(!allowedHosts.includes('http://localhost:8080'));
    });

    it('should support basic strings', () => {
        // when
        const allowedHosts = AllowedHosts({
            allowedHosts: ['https://localhost', 'http://localhost:8080']
        });

        // then
        assert.ok(allowedHosts.includes('https://localhost'));
        assert.ok(allowedHosts.includes('http://localhost:8080'));
    });

    it('should support regular expressions', () => {
        // when
        const allowedHosts = AllowedHosts({
            allowedHosts: [/^http(s)?:\/\/localhost$/]
        });

        // then
        assert.ok(allowedHosts.includes('https://localhost'));
        assert.ok(allowedHosts.includes('http://localhost'));
    });
});