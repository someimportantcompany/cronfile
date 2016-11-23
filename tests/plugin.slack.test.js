var assert = require('assert');
var nock = require('nock');
var rewire = require('rewire');

describe('plugins/slack', function () {
  var slack = rewire('../plugins/slack');
  var TIMESTAMP = 1479911229452;
  var WEBHOOK_URL = 'https://hooks.slack.com/services/team/integration/identifier';

  it('should throw an error if the webhook_url is missing', function () {
    var err = null;

    try { slack({}); }
    catch (e) { err = e; }

    assert.ok(err instanceof Error);
    assert.equal(err.message, 'Missing Slack webhook_url');
  });

  it('should throw an error if the webhook_url is invalid', function () {
    var err = null;

    try { slack({ webhook_url: '/dev/null' }); } // Ehehe
    catch (e) { err = e; }

    assert.ok(err instanceof Error);
    assert.equal(err.message, 'Invalid URL for webhook_url');
  });

  it('should return a function', function () {
    var fn = slack({
      webhook_url: WEBHOOK_URL,
      channel: '#devops',
      username: 'cron-bot',
      icon_emoji: ':robot:'
    });

    assert.equal(typeof fn, 'function', 'Expected the Slack plugin to return a function');
    assert.equal(fn.length, 3, 'Expected the returned function to accept three arguments');
  });

  it('should send results to Slack', function (done) {
    nock('https://hooks.slack.com:443/')
      .post('/services/team/integration/identifier', '{"attachments":["results"]}')
      .reply(200, '{"success":true}');

    var fn = slack({
      webhook_url: WEBHOOK_URL,
      formatResults: function () {
        return 'results';
      }
    });

    assert.equal(typeof fn, 'function', 'Expected the Slack plugin to return a function');
    assert.equal(fn.length, 3, 'Expected the returned function to accept three arguments');

    fn({ fns: 8, errored: 1 }, new Date(TIMESTAMP), done);
  });

  it('should handle errors from Slack', function (done) {
    nock('https://hooks.slack.com:443/')
      .post('/services/team/integration/identifier', '{"attachments":["error"]}')
      .reply(400, '"No"');

    var fn = slack({
      webhook_url: WEBHOOK_URL,
      formatErr: function () {
        return 'error';
      }
    });

    assert.equal(typeof fn, 'function', 'Expected the Slack plugin to return a function');
    assert.equal(fn.length, 3, 'Expected the returned function to accept three arguments');

    fn(new Error('Dieds'), null, function (err) {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'Bad response from Slack sending {"attachments":["error"]}: 400: "No"');
      done();
    });
  });

  describe('formatErr', function () {
    var formatErr = slack.__get__('formatErr');

    it('should format an error correctly', function () {
      var result = formatErr(new TypeError('This is the error you are looking for'));
      assert.deepEqual(result, {
        fallback: 'TypeError: This is the error you are looking for',
        color: 'danger',
        text: 'TypeError: This is the error you are looking for',
      });
    });

    it('should format a string correctly', function () {
      var result = formatErr('This is the error you are looking for');
      assert.deepEqual(result, {
        fallback: 'Error: This is the error you are looking for',
        color: 'danger',
        text: 'Error: This is the error you are looking for',
      });
    });
  });

  describe('formatResults', function () {
    var formatResults = slack.__get__('formatResults');

    it('should format an object correctly', function () {
      var result = formatResults({ key1: 'value1', key2: 'value2' });
      assert.deepEqual(result, {
        fallback: '{"key1":"value1","key2":"value2"}',
        color: '#439FE0',
        fields: [
          { title: 'key1', value: 'value1', short: true },
          { title: 'key2', value: 'value2', short: true },
        ]
      });
    });
  });

});
