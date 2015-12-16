var async = require('async');
var later = require('later');

var EVENTS = [ 'start', 'stop' ];

function Cron() {
  this.args = [];
  this.flags = [];

  this.aliases = {};

  this.crons = {};
  this.events = {};
}

Cron.prototype.aliases = function (raw) {
  for (var time in raw) if (raw.hasOwnProperty(time)) {
    (Array.isArray(raw[time]) ? raw[time] : [ raw[time] ]).forEach(function (time) {
      this.aliases[alias] = time;
    });
  }
  return this;
};

Cron.prototype.on = function (cronTime, cronFn) {
  var target = EVENTS.indexOf(cronTime.toString().toLowerCase()) >= 0 ? 'events' : 'crons';
  if (target === 'crons' && this.aliases.hasOwnProperty(cronTime)) cronTime = this.aliases[cronTime];

  this[target][cronTime] = this[target][cronTime] || [];
  if (Array.isArray(cronFn)) this[target][cronTime] = this[target][cronTime].concat(cronFn);
  else this[target][cronTime].push(cronFn);

  return this;
};

var run = false;
Cron.prototype.run = function (callback) {
  if (!callback) callback = function (err) {
    if (err) console.error(err.toString());
    process.exit(err ? 1 : 0);
  };

  if (run) return callback(Error('You cannot run the Cron library twice'));
  run = true;

  var date = new Date();
  date.setSeconds(0); // Date has seconds, and we don't want seconds (yet!)

  var fns = [];
  Object.keys(this.crons).forEach(function (time) {
    if (later.schedule(later.parse.cron(time)).isValid(date)) {
      fns = fns.concat(this.crons[time]);
    }
  }.bind(this));

  async.series([].concat(
    Array.isArray(this.events.start) ? this.events.start : [],
    async.parallel.bind(async.parallel, fns),
    Array.isArray(this.events.stop) ? this.events.stop : []
  ), callback);
};

Cron.prototype.stop = function (callback) {
  async.series(Array.isArray(this.events.stop) ? this.events.stop : [], callback);
};

var cronfile = new Cron();
cronfile.aliases(require('./aliases.json'));

module.exports = cronfile;
