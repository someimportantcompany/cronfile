var cron = require('../lib/cron'); // cronfile
var logger = require('chill-logger')({ name: 'cron' });
var slack = require('../plugins/slack'); // cronfile/plugins/slack

cron.once('started', function (wait_time) {
  logger.info('started', { waiting: wait_time });
});

cron.on('tick', function (date, matches) {
  logger.info('tick', {
    date: date.toString(),
    matches: matches
  });
});

cron.on('error', function (err, date) {
  if (date) err.message = 'An error occurred executing a cron at ' + date.toString() + ': ' + err.message;
  logger.error(err);
});

cron.on('results', slack({
  webhook_url: 'https://www.slack.com/.../.../.../'
}));

cron.on('every_minute', function () {
  logger.debug('Hello, world!');
});

cron.on('every_two_minutes', [
  function () {
    logger.debug('Hello, world #1!');
  },
  function () {
    logger.debug('Hello, world #2!');
  }
]);

process.on('uncaughtException', function (err) {
  logger.error('fatal', err);
  process.exit(1);
});
