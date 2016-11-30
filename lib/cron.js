var async = require('async');
var EventEmitter = require('events');
var later = require('later');

function Cronfile() {
  this._alias = {};
  this._crons = [];
  this._events = new EventEmitter();
}

/**
 * A mapping of times to aliases
 * See the README or aliases.json for the exact structure you can use
 */
Cronfile.prototype.aliases = function (mapping) {
  for (var time in mapping) /* istanbul ignore else */ if (mapping.hasOwnProperty(time)) {
    if (!Array.isArray(mapping[time])) mapping[time] = [ mapping[time] ];
    for (var i = 0; i < mapping[time].length; i++) this._alias[mapping[time][i]] = time;
  }
  return this;
};

Cronfile.prototype.emit = function () {
  this._events.emit.apply(this._events, arguments);
};

Cronfile.prototype.get = function (date) {
  return this._crons
    .filter(function (cron) {
      return later.schedule(later.parse.cron('' + cron.time)).isValid(date);
    })
    .map(function (cron) {
      return cron.fn;
    });
};

Cronfile.prototype.once = function () {
  this._events.once.apply(this._events, arguments);
};

function transformFns(fn) {
  if (typeof fn !== 'function') throw new TypeError('Expected argument to be a function, found ' + typeof fn);

  if (fn.length === 0) return function (callback) {
    try {
      var r = fn();
      if (r && typeof r.then === 'function') {
        r.then(function () {
          callback();
        }, function (err) {
          callback(err);
        });
      }
      else callback();
    }
    catch (e) {
      callback(e);
    }
  };
  else return fn;
}

Cronfile.prototype.on = function (cronTime, cronFn) {
  // If this time is an alias to another time, then overwrite back to the "crontime"
  if (this._alias.hasOwnProperty(cronTime)) cronTime = this._alias[cronTime];
  // If one is simply trying to add events to the emitter, then let them
  else if (!/^([\ \*\d\/]*)$/.test(cronTime)) return this._events.on.call(this._events, cronTime, cronFn);

  if (Array.isArray(cronFn)) cronFn = async.series.bind(async, cronFn.map(transformFns));
  else cronFn = transformFns(cronFn);

  this._crons.push({
    time: cronTime,
    fn: cronFn
  });
};

var cron = new Cronfile();
module.exports = cron;
