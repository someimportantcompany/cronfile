var async = require('async');
var fs = require('fs');
var later = require('later');
var path = require('path');

var EVENTS = [ 'start', 'stop' ];
var IS_RUNNING = false;

var LOCKING = (function () {
  var LOCKING = {};
  var LOCKNAME = 'cron.lock';
  var LOCKPATH = path.join(process.env.CWD, LOCKNAME);

  LOCKING.start = function (times, callback) {
    if (IS_RUNNING) return callback(Error('You cannot run the Cron library twice'));

    if (module.parent && module.parent.filename) {
      LOCKNAME = path.basename(module.parent.filename, path.extname(module.parent.filename)) + '.lock';
      LOCKPATH = path.join(process.env.CWD, LOCKNAME);
    }

    console.log('Locking with', LOCKPATH);

    fs.access(LOCKPATH, function (err) {
      if (err && err.code !== 'ENOENT') return callback(err || new Error('Cron already running'));
      fs.writeFile(LOCKPATH, '1', 'utf8', callback);
    });
  };

  LOCKING.stop = function (callback) {
    IS_RUNNING = false;
    fs.unlink(LOCKPATH, callback);
  };

  return LOCKING;
})();

/**
 * Introducing, the Cron!
 */
function Cron() {
  this._alias = {};
  this._help = {};

  this._crons = {};
  this._events = {};
}

/**
 * A mapping of times to aliases
 * See the README or aliases.json for the exact structure you can use
 */
Cron.prototype.aliases = function (mapping) {
  for (var time in mapping) /* istanbul ignore else */ if (mapping.hasOwnProperty(time)) {
    if (!Array.isArray(mapping[time])) mapping[time] = [ mapping[time] ];
    for (var i = 0; i < mapping[time].length; i++) this._alias[mapping[time][i]] = time;
  }
  return this;
};

var transformFns = function (fn) {
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
  if (fn.length === 1) return fn;
};

/**
 * Adds functions to run when a specific cron-time is matched
 * A "cron-time" can be in the standard UNIX cron format OR a pre-defined alias OR it can be a specific event
 * Either way, it will be executed at runtime
 *
 * @param {String} cronTime A time, or an alias, or an event
 * (@param {String} cronDescription An optional description for the cron job)
 * @param {Function|Array[Function]} cronFn Functions expecting a single "callback" argument
 * @return {Cron} Returns the current instance for chaining
 */
Cron.prototype.on = function (cronTime, cronDescription, cronFn) {
  if (typeof cronDescription === 'function' || Array.isArray(cronDescription)) {
    cronFn = cronDescription;
    cronDescription = null;
  }

  var target = EVENTS.indexOf(cronTime.toString().toLowerCase()) >= 0 ? '_events' : '_crons';
  if (target === '_crons' && this._alias.hasOwnProperty(cronTime)) cronTime = this._alias[cronTime];

  this[target][cronTime] = this[target][cronTime] || [];
  if (Array.isArray(cronFn)) this[target][cronTime] = this[target][cronTime].concat(cronFn.map(transformFns));
  else this[target][cronTime].push(transformFns(cronFn));

  if (cronDescription) {
    this._help[target] = this._help[target] || {};
    this._help[target][cronTime] = this._help[target][cronTime] || [];
    this._help[target][cronTime].push(cronDescription);
  }

  return this;
};

/**
 * List all the help descriptions stored in an easy-to-understand list!
 *
 * @return {String}
 */
Cron.prototype.list = function () {
  var out = [];

  if (this._events && this._events.start && this._events.start.length > 0) {
    out.push('start (' + this._events.start.length + ' event' + (this._events.start.length === 1 ? '' : 's') + ')');
    if (this._help._events && this._help._events.start) {
      out = out.concat(this._help._events.start.map(function (cronDescription) {
        return '- ' + cronDescription;
      }));
    }
    out.push('');
  }

  for (var time in this._crons) if (this._crons.hasOwnProperty(time)) {
    out.push(time + ' (' + this._crons[time].length + ' event' + (this._crons[time].length === 1 ? '' : 's') + ')');
    if (this._help._crons && this._help._crons[time]) {
      out = out.concat(this._help._crons[time].map(function (cronDescription) {
        return '- ' + cronDescription;
      }));
    }
    out.push('');
  }

  if (this._events && this._events.stop && this._events.stop.length > 0) {
    out.push('stop (' + this._events.stop.length + ' event' + (this._events.stop.length === 1 ? '' : 's') + ')');
    if (this._help._events && this._help._events.stop) {
      out = out.concat(this._help._events.stop.map(function (cronDescription) {
        return '- ' + cronDescription;
      }));
    }
  }

  return out.join('\n');
};

/**
 * Initiate the cron jobs
 * Works out the current time down to the nearest minute, filters out all the jobs that don't match and run the rest
 *
 * (@param {String[]} args An optional array of string arguments)
 * (@param {Function} callback An optional callback function to run on completion (takes a single error argument))
 * @return void
 */
Cron.prototype.run = function (args, callback) {
  /* istanbul ignore next */
  if (!args && !callback) {
    args = process.argv.slice(2);
    callback = null;
  }

  if (typeof args === 'function') {
    callback = args;
    args = process.argv.slice(2);
  }

  /* istanbul ignore next */
  if (!callback) callback = function (err) {
    if (err) console.error(err.stack ? err.stack : err.toString());
    process.exit(err ? 1 : 0);
  };

  if (IS_RUNNING) return callback(new Error('You cannot run the Cron library twice'));
  IS_RUNNING = true;

  var date = new Date();
  var opts = {
    use_locking: (args.indexOf('--no-locking') < 0)
  };

  /**
   * If we have a set of arguments, then run them.
   */
  if (args.length > 0) {
    /* istanbul ignore next */
    if (args[0] === 'list') {
      console.log(this.list());
      return callback();
    }
    else if (args[0] === 'test') {
      this._crons.every_minute = this._crons.every_minute || [];
      for (var p in this._crons) if (p !== 'every_minute' && this._crons.hasOwnProperty(p)) {
        this._crons.every_minute = this._crons.every_minute.concat(this._crons[p]);
        this._crons[p] = [];
      }
    }
    else if (args[0].indexOf(':') > 0) {
      date.setHours(
        parseInt(args[0].substr(0, args[0].indexOf(':')), 10),
        parseInt(args[0].substr(args[0].indexOf(':') + 1), 10)
      );
    }
  }

  date.setSeconds(0); // Date has seconds, and we don't want seconds

  var fns = [];
  var times = [];
  Object.keys(this._crons).forEach(function (time) {
    if (later.schedule(later.parse.cron(time)).isValid(date)) {
      fns = fns.concat(this._crons[time]);
      times.push(time);
    }
  }.bind(this));

  this._events.start = this._events.start || [];
  this._events.stop = this._events.stop || [];

  if (opts.use_locking && LOCKING.start && LOCKING.stop) {
    this._events.start.unshift(LOCKING.start.bind(null, times));
    this._events.stop.unshift(LOCKING.stop.bind(null, times));
  }

  async.series([].concat(
    this._events.start,
    [ async.parallel.bind(async.parallel, fns) ],
    this._events.stop
  ), function (err) {
    if (err && IS_RUNNING && opts.use_locking && LOCKING.stop) {
      return LOCKING.stop(function () {
        callback(err);
      });
    }
    else callback(err);
  });
};

/**
 * On emergency-exit situations, call just the stop functions.
 *
 * @param {Function} callback A callback argument taking an error function
 */
Cron.prototype.stop = function (callback) {
  async.series(Array.isArray(this._events.stop) ? this._events.stop : [], function (err) {
    if (IS_RUNNING && LOCKING.stop) LOCKING.stop(function () { callback(err); });
    else callback(err);
  });
};

var cronfile = new Cron();
cronfile.aliases(require('./aliases.json'));

module.exports = cronfile;
