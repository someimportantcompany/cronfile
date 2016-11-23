#!/usr/bin/env node
var yargs = require('yargs')
  .usage('Usage: cron [options] [file 1] (... [file n])')

  .describe('time', 'Optionally fake a certain time to manually test functions')
  .nargs('time', 1)
  .alias('t', 'time')

  .help('help')
  .count('verbose')
  .describe('verbose', 'Print info/debug statements')
  .alias('v', 'verbose')

  .epilog('More information: https://github.com/jdrydn/cronfile');

var args = yargs.argv;
// Print the args if verbose enough
if (args.verbose >= 2) console.log('Args %j', args);

if (process.env.NODE_ENV === 'production') {
  // If we're in production, with an inappropriate flag, then throw an error
  if (args.time) throw new Error('You cannot fake a time in production');
}

var async = require('async');
var cron = require('../lib/cron');
var ms = require('ms');
var path = require('path');

// By default, sans argument, we call back to "cronfile.js"
if (!args._.length) args._ = [ 'cronfile.js' ];

args._.forEach(function (file) {
  if (file.indexOf('~/') === 0) file = path.join(process.env.HOME, file.substr(1));
  else if (file.indexOf('/') !== 0) file = path.join(process.env.PWD, file);
  if (args.verbose >= 1) console.log('Loading', file); // jshint ignore:line
  require(file);
});

function eachTick(date) {
  var fns = cron.get(date);

  if (args.verbose >= 1) console.log('\n%s - %d functions to run', date, fns.length); // jshint ignore:line
  cron._events.emit('tick', date, fns.length);
  if (fns.length === 0) return;

  async.parallel(fns.map(function (fn) {
    return function (callback) {
      fn(function (err) {
        if (err) cron._events.emit('error', err, date);
        callback();
      });
    };
  }));
}

// If we set a time, then force that time for this run, and only run once
if (args.time) {
  (function () {
    if (/^[\d]+:[\d]+$/.test(args.time)) {
      args.time = (function (t) {
        var date = new Date();
        date.setHours(parseInt(t.substr(0, t.indexOf(':')), 10), parseInt(t.substr(t.indexOf(':') + 1), 10));
        date.setSeconds(0);
        return date;
      })(args.time);
    }
    if (!Date.parse(args.time)) throw new Error('Invalid date: ' + args.time);
    eachTick(new Date(args.time));
  })();
} else {
  (function () {
    var wait_time = ((60 - (new Date()).getSeconds()) || 60) + 's';
    if (args.verbose >= 1) console.log('Waiting %s for the next minute', wait_time); // jshint ignore:line
    cron._events.emit('started', wait_time);

    setTimeout(function () {
      process.nextTick(function tock() {
        // Set the timeout for the next minute
        setTimeout(function () { process.nextTick(tock); }, ms('1m'));
        // Trigger all the functions for this minute
        eachTick(new Date());
      });
    }, ms(wait_time));
  })();
}
