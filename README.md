# cronfile

---

Hi there :wave:

This library is deprecated, consider instead using your own cloud architecture to schedule functions:

- [AWS Cloudwatch Events](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/RunLambdaSchedule.html)
- [GCP Cloud Scheduler](https://cloud.google.com/scheduler)

---

Javascript-based CRON process.

```sh
$ npm install --save cronfile
```

**Note:** This is for the new `cronfile`, which is now an in-memory cron-like execution service. For the older version
of `cronfile`, which requires you to execute a script every minute using a pre-existing crontab,
[see 1.0.0 here](https://github.com/jdrydn/cronfile/tree/1.0.0).

## Why

Every single time we're writing a cron script for our app, it always looks something like this:

```
*/1 * * * * /usr/bin/node ~/project/scripts/crons/some_action.js
*/15 * * * * /usr/bin/node ~/project/scripts/crons/some_other_action.js
*/20 * * * * /usr/bin/node ~/project/scripts/crons/yet_another_action.js
```

Where the files all look something like:

```js
var execute = function (callback) {
  do_some_action({ flush_cache: true }, callback);
};

execute(function (err) {
  if (err) console.error(err.toString());
  process.exit(err ? 1 : 0);
});
```

And that repeats for several files? Yuck. No.

Since most, if not all, of the cron jobs I run on a per-project basis are the same language, Javascript, here is a
simplified way to write the cron jobs as part of your codebase, checking them into a repository and managing them
through whichever deployment process you are comfortable with!

## Usage

In it's simplest usage:

```js
var cron = require('cronfile');

cron.on('*/1 * * * *', function () {
  console.log('Executing this function every minute!');
});

cron.on('*/15 * * * *', function (callback) {
  console.log('Executing this function every fifteen minutes!');
  callback();
});

cron.on('*/20 * * * *', function (callback) {
  console.log('Executing this function every twenty minutes!');
  callback(new Error('It failed, for some reason 😢'));
});
```

Next, grab your friendly neighbourhood production environment ([PM2](https://github.com/Unitech/pm2),
[Docker](https://www.docker.com/)) and run the cronfile:

```sh
$ npm install -g cronfile
# Assuming the above example is at cron.js
$ cronfile ./cron.js
```

Although keep reading, if you're not a fan of emails then you can send the error somewhere else,
[to Slack for instance](#cronrun)

## Aliases

You can attach events to times based on human-readable aliases rather than cron-timestamps, as defined in the
[`aliases.json`](./lib/aliases.json) file, so the above example could actually look like:

```js
var cron = require('cronfile');

cron.on('every_minute', function () {
  console.log('Executing this function every minute!');
});

cron.on('every_fifteen_minutes', function () {
  console.log('Executing this function every fifteen minutes!');
});

cron.on('every_twenty_minutes', function () {
  console.log('Executing this function every twenty minutes!');
});
```

You can also add your own aliases using `cron.aliases`:

```js
cron.aliases({
  '* 2 * * *': '2AM',
  '* */5 * * *': [ 'every_five_hours', 'five_hours' ],
});
```

This function takes an object where each object key is a valid cron timestamp and the value is a string (or an array
of strings (for multiple aliases to the same timestamp)) of the alias in question. It can be anything you want, but
you must keep it unique (otherwise you'll start overwriting aliases and have unexpected side-effects!)

## Events

`cronfile` now supports true events powered by an event emitter, so you can hook into various events that are emitted
throughout the life cycle. This also means the exposed `cron` instance has `on`, `once` and `emit` for you to use at
your leisure.

### Started

When `cronfile` starts, it loads the crons and waits for the next minute to start before. The `started` event emits
when it's waiting, and includes the time it's waiting for.

```js
cron.once('started', function (wait_time) {
  console.log('Waiting for', wait_time); // Waiting for 10s
});
```

### Error

When the `cronfile` errors, either internally or from one of your cron functions, you can handle them using the `error`
event. The listener will be sent the error & if this came from a cron function then the date object that triggered the
function will also be passed:

```js
cron.on('error', function (err, time) {
  if (!time) console.error('Internal error:', err);
  else console.error('Cron error:', time.toString(), err);
});
```

### Tick

Every minute the cronfile executes, it emits a `tick` event passing the time & the number of functions that matched the
time.

```js
cron.on('tick', function (time, count) {
  console.log('%s x%d', time.toString(), count);
});
```

Ideal for monitoring your `cronfile` & ensuring it's executing on it's minutely basis.

### And your own!

And of course, you can create your own events and fire them off whenever you see fit!

```js
cron.on('clear-generic-cache', function () {
  // Do something
});

cron.on('*/15 * * * *', function () {
  cron.emit('clear-generic-cache');
});

cron.on('0 */1 * * *', function () {
  cron.emit('clear-generic-cache');
});
```

**Note:** Take care when adding event names similar to cron timestamps, they may be interpreted as cron functions! And
also take care when adding event names that are the same as [aliases](#aliases), since they too will be interpreted as
cron functions!

## CLI Documentation

So, you've written your functions, you've got everything running the way you want, now it's time to test your crons &
then run your functions, with the CLI:

```
# You can either install globally
$ npm install -g cronfile
$ cronfile ./cron.js ./more/cron.js

# Or you can install locally
$ npm install --save cronfile
$ node ./node_modules/.bin/cronfile ./cron.js ./more/cron.js
```

Either way, the CLI takes your cron files (i.e. the files with your `cron.on` calls) as arguments. If you don't add any
files then the CLI will default to `cronfile.js`. Any missing files will throw errors on boot, too!

Often `cronfile` is installed locally and an npm-script is assigned to it, for convenience, similar to:

```json
{
  "name": "my-awesome-project",
  "scripts": {
    "cron": "cronfile cron.js"
  },
  "dependencies": {
    "cronfile": "^2.0.0"
  }
}
```

And then executed with:

```
$ npm run cron
```

### Manually testing

You can test your `cronfile` by passing an appropriate time to the CLI with `-t`:

```
# To execute at TODAY 12:12
$ cronfile -t 12:21 cron.js

# To execute at a specific day of the week, day, etc.
$ cronfile -t "Wed Nov 23 2016 17:22:52 GMT+0000 (GMT)" cron.js
```

## One more thing

- Want to know what's coming up? Feel free to read through
  [the TODO document on GitHub](https://github.com/jdrydn/cronfile/blob/master/TODO.md)!
- Questions? Awesome! [Open an issue](https://github.com/jdrydn/cronfile/issues) or feel free to
  [tweet me](https://twitter.com/jdrydn) and I'll get back to you!
- Who am I? If you really wanna know [here's my website](https://jdrydn.com)...
