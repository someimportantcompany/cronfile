# Cronfile

A rather elegant solution to running cron jobs in Node.

```
npm install cronfile
```

## Why

Every single time we're writing a cron script for our app, it always looks something like this:

```
*/1 * * * * /usr/bin/node ~/project/scripts/crons/some_action.js
*/15 * * * * /usr/bin/node ~/project/scripts/crons/some_other_action.js
*/20 * * * * /usr/bin/node ~/project/scripts/crons/yet_another_action.js
```

Where the files all look something like:

```
var execute = function (callback) {
  do_some_action({ flush_cache: true }, callback);
};

execute(function (err) {
  if (err) console.error(err.toString());
  process.exit(err ? 1 : 0);
});
```

## Usage

In it's simplest usage:

```
var cron = require('cronfile');

cron.on('*/1 * * * *', function (callback) {
  console.log('Executing this function every minute!');
  callback();
});

cron.on('*/15 * * * *', function (callback) {
  console.log('Executing this function every fifteen minutes!');
  callback();
});

cron.on('*/20 * * * *', function (callback) {
  console.log('Executing this function every twenty minutes!');
  callback();
});

cron.run();
```

All `cronfile`s are designed to be run every minute, so set your crontab to something like:

```
*/1 * * * * ~/project/cron.js
```

And add a `MAILTO` environment variable to get any error output emailed to you, like so:

```
MAILTO="crons@myawesomeprojectwebsite.com"
*/1 * * * * ~/project/cron.js
```

## Aliases

You can attach events to times based on human-readable aliases rather than cron-timestamps, as defined in the
[`aliases.json`](./aliases.json) file, so the above example could actually look like:

```
var cron = require('cronfile');

cron.on('every_minute', function (callback) {
  console.log('Executing this function every minute!');
  callback();
});

cron.on('every_fifteen_minutes', function (callback) {
  console.log('Executing this function every fifteen minutes!');
  callback();
});

cron.on('every_twenty_minutes', function (callback) {
  console.log('Executing this function every twenty minutes!');
  callback();
});

cron.run();
```

You can also add your own aliases if wish, using [`cron.aliases`](#cron-aliases).

## Events

There are two main events you can write hooks for: `start` and `stop`. As their names intuitively suggest, you can set
functions to run when the cronfile starts (before any of the specific time-based functions run) and you can set
functions to run after the cronfile has finished (after all the time-based functions have finished).

For example, if all your time-based functions use a database connection:

```
var connections = require('./lib/connections');
var cron = require('cronfile');

var connection = null;

cron.on('start', function (callback) {
  connections.getConnection(function (err, conn) {
    if (err) return callback(err);

    connection = conn;
    callback();
  });
});

cron.on('the_hour', function (callback) {
  connection.runQuery('v1_reload_user_scores', callback);
});

cron.on('stop', function (callback) {
  connection.release(callback);
});

cron.run();
```

## API

### cron.on

Add new cron functions to the cronfile. You can attach functions to specific cron-formatted times, or an alias, or an
event:

```
cron.on('*/1 * * * *', function (callback) {
  console.log('Executing this function every minute!');
  callback();
});
```

### cron.aliases

Add new aliases to the cronfile for you to use.

```
cron.aliases({
  '* 2 * * *': '2AM',
  '* */5 * * *': [
    'every_five_hours', 'five_hours'
  ]
});
```

### cron.run

```
cron.run([callback]);
```

This function executes the cronfile. You can only run this once, and it will error appropriately if you try to run it
multiple times. It optionally takes a callback function that will have `err` as it's first argument, allowing you to
perform custom actions when the cronfile has finished, although you may prefer to use a [`stop`](#events) event.

For example, to send errors to a Slack channel:

```
var Slack = require('./lib/slack');

var bot = new Slack({
  channel: '#alerts',
  icon_emoji: ':robot_face:',
  username: 'cron-bot'
});

cron.run(function (err) {
  if (err) {
    bot.error(err.toString(), function (err_slack) {
      if (err_slack) {
        console.error('An error occurred running the cron script');
        console.error(err.toString());
        console.error('Additionally, there was an error sending the error to Slack');
        console.error(err_slack.toString());
      }
      process.exit(1);
    });
  }
  else process.exit(0);
});
```
