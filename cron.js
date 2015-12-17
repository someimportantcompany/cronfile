var async = require('async');
var later = require('later');

var EVENTS = [ 'start', 'stop' ];

function Cron() {
  this._alias = {};

  this._crons = {};
  this._events = {};
}

Cron.prototype.aliases = function (raw) {
  for (var time in raw) /* istanbul ignore else */ if (raw.hasOwnProperty(time)) {
    if (!Array.isArray(raw[time])) raw[time] = [ raw[time] ];
    for (var i = 0; i < raw[time].length; i++) this._alias[raw[time][i]] = time;
  }
  return this;
};

Cron.prototype.on = function (cronTime, cronFn) {
  var target = EVENTS.indexOf(cronTime.toString().toLowerCase()) >= 0 ? '_events' : '_crons';
  if (target === '_crons' && this._alias.hasOwnProperty(cronTime)) cronTime = this._alias[cronTime];

  this[target][cronTime] = this[target][cronTime] || [];
  if (Array.isArray(cronFn)) this[target][cronTime] = this[target][cronTime].concat(cronFn);
  else this[target][cronTime].push(cronFn);

  return this;
};

var run = false;
Cron.prototype.run = function (callback) {
  /* istanbul ignore next */
  if (!callback) callback = function (err) {
    if (err) console.error(err.toString());
    process.exit(err ? 1 : 0);
  };

  if (run) return callback(Error('You cannot run the Cron library twice'));
  run = true;

  var date = new Date();
  date.setSeconds(0); // Date has seconds, and we don't want seconds (yet!)

  var fns = [];
  Object.keys(this._crons).forEach(function (time) {
    if (later.schedule(later.parse.cron(time)).isValid(date)) fns = fns.concat(this._crons[time]);
  }.bind(this));

  async.series([].concat(
    Array.isArray(this._events.start) ? this._events.start : [],
    async.parallel.bind(async.parallel, fns),
    Array.isArray(this._events.stop) ? this._events.stop : []
  ), callback);
};

Cron.prototype.stop = function (callback) {
  async.series(Array.isArray(this._events.stop) ? this._events.stop : [], callback);
};

var cronfile = new Cron();
cronfile.aliases(require('./aliases.json'));

module.exports = cronfile;
