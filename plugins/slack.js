var cron = require('../lib/cron');
var https = require('https');
var url = require('url');
var version = require('../package.json').version;

function formatErr(err) {
  return {
    fallback: (err.name || 'Error') + ': ' + (err.message || ('' + err)),
    color: 'danger',
    text: (err.name || 'Error') + ': ' + (err.message || ('' + err)),
  };
}

function formatResults(results) {
  return {
    fallback: JSON.stringify(results),
    color: '#439FE0',
    fields: Object.keys(results).map(function (key) {
      return {
        title: key,
        value: results[key],
        short: true
      };
    })
  };
}

module.exports = function (opts) {
  if (!opts || !opts.webhook_url) throw new Error('Missing Slack webhook_url');

  var parsed_webhook_url = url.parse(opts.webhook_url);
  if (!parsed_webhook_url.hostname || !parsed_webhook_url.pathname) throw new Error('Invalid URL for webhook_url');

  opts.formatErr = opts.formatErr || formatErr;
  opts.formatResults = opts.formatResults || formatResults;

  var req_opts = {
    method: 'POST',
    hostname: parsed_webhook_url.hostname,
    port: 443,
    path: parsed_webhook_url.path,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'user-agent': 'cronfile-plugin-slack-' + version,
    }
  };

  var defaults = {};
  if (opts.channel) defaults.channel = opts.channel;
  if (opts.username) defaults.username = opts.username;
  if (opts.icon_emoji) defaults.icon_emoji = opts.icon_emoji;

  return function (results, date, callback) {
    var req_body = JSON.stringify(Object.assign({}, defaults, {
      attachments: [
        Object.assign((results instanceof Error ? opts.formatErr(results) : opts.formatResults(results)), {
          ts: (date || Date.now()) / 1000
        })
      ]
    }));

    /* istanbul ignore next */
    callback = callback || function (err) {
      if (results instanceof Error) console.error(err); // jshint ignore:line
      else cron.emit('error', err);
    };

    var req = https.request(req_opts, function (res) {
      if (res.statusCode === 200) return callback();

      var res_body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        res_body += chunk;
      });
      res.on('end', function () {
        var err = new Error('Bad response from Slack sending ' + req_body + ': ' + res.statusCode + ': ' + res_body);
        callback(err);
      });
    });

    /* istanbul ignore next */
    req.on('error', function (err) {
      err.message = 'Error sending data ' + req_body + ' to Slack: ' + err.message;
      callback(err);
    });

    req.write(req_body);
    req.end();
  };
};
