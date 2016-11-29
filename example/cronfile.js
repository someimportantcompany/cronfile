var cron = require('../index'); // cronfile
// var slack = require('../plugins/slack'); // cronfile/plugins/slack

cron.once('started', function (wait_time) {
  console.log('cronfile has started, waiting %s', wait_time);
});

cron.on('tick', function (date, matches) {
  console.log('tick %s %d matches', date, matches);
});

cron.on('error', function (err, date) {
  if (date) err.message = 'An error occurred executing a cron at ' + date.toString() + ': ' + err.message;
  console.error(err);
});

// cron.on('results', slack({
//   webhook_url: 'https://www.slack.com/.../.../.../'
// }));

cron.on('every_minute', function () {
  console.log('Every minute');
});

cron.on('every_two_minutes', function () {
  console.log('Every two minutes');
});
