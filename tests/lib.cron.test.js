var assert = require('assert');
var Promise = require('bluebird');
var rewire = require('rewire');

describe('lib/cron', function () {
  var Cronfile = rewire('../lib/cron').__get__('Cronfile');

  it('should receive aliases correctly', function () {
    var cron = new Cronfile();
    cron.aliases({
      '0 0 1 1 *': [ '@yearly', '@annually' ],
      '0 0 1 * *': '@monthly',
    });

    assert.deepEqual(cron._alias, {
      '@yearly': '0 0 1 1 *',
      '@annually': '0 0 1 1 *',
      '@monthly': '0 0 1 * *',
    });
  });

  it('should fire events correctly', function () {
    var cron = new Cronfile();
    var fired = false;

    cron.once('ping', function (arg) {
      assert.equal(arg, 'pong');
      fired = true;
    });
    assert.equal(cron._events.listenerCount('ping'), 1, 'Failed to attach listener to ping');

    cron.emit('ping', 'pong');
    assert.equal(cron._events.listenerCount('ping'), 0, 'Failed to fire ping event');
    assert.equal(fired, true, 'Failed to execute listener for ping event');
  });

  it('should return no functions when no functions have been added', function () {
    var cron = new Cronfile();
    assert.equal(cron._crons.length, 0, 'Expected no cron functions to be in the list of crons');
    var fns = cron.get(new Date());
    assert.equal(fns.length, 0, 'Expected no functions to be returned');
  });

  it('should return functions when they match the current time', function (done) {
    var cron = new Cronfile();
    var fired = true;

    cron.on('*/1 * * * *', function () { fired = true; });
    cron.on('*/2 * * * *', function (callback) { /* jshint unused:false */ });

    assert.equal(cron._events.listenerCount('*/1 * * * *'), 0, 'Failed to attach cron function to cron list');
    assert.equal(cron._crons.length, 2, 'Failed to attach both cron functions to cron list');

    var fns = cron.get(new Date('Tue Nov 22 2016 17:27:00 GMT+0000 (GMT)'));
    assert.equal(fns.length, 1, 'Expected one function to be returned');
    assert.equal(typeof fns[0], 'function', 'Expected one function to be returned');

    fns[0].call(null, function () {
      assert.equal(fired, true, 'Failed to execute cron function');
      done();
    });
  });

  it('should handle errors that are thrown', function (done) {
    var cron = new Cronfile();

    cron.on('*/1 * * * *', function () { throw new Error('This is the error you are looking for'); });
    assert.equal(cron._crons.length, 1, 'Failed to attach cron function to cron list');

    var fns = cron.get(new Date('Tue Nov 22 2016 17:27:00 GMT+0000 (GMT)'));
    assert.equal(fns.length, 1, 'Expected one function to be returned');
    assert.equal(typeof fns[0], 'function', 'Expected one function to be returned');

    fns[0].call(null, function (err) {
      assert.ok(err instanceof Error, 'Expected err to be an instance of Error');
      assert.equal(err.message, 'This is the error you are looking for');
      done();
    });
  });

  it('should handle successful promises', function (done) {
    var cron = new Cronfile();
    var fired = false;

    cron.on('*/1 * * * *', function () {
      return new Promise(function (resolveFn, rejectFn) {
        /* jshint unused:false */
        fired = true;
        resolveFn();
      });
    });
    assert.equal(cron._crons.length, 1, 'Failed to attach cron function to cron list');

    var fns = cron.get(new Date('Tue Nov 22 2016 17:27:00 GMT+0000 (GMT)'));
    assert.equal(fns.length, 1, 'Expected one function to be returned');
    assert.equal(typeof fns[0], 'function', 'Expected one function to be returned');

    fns[0].call(null, function () {
      assert.equal(fired, true, 'Failed to execute cron function');
      done();
    });
  });

  it('should handle errored promises', function (done) {
    var cron = new Cronfile();

    cron.on('*/1 * * * *', function () {
      return new Promise(function (resolveFn, rejectFn) {
        rejectFn(new Error('This is the error you are looking for'));
      });
    });
    assert.equal(cron._crons.length, 1, 'Failed to attach cron function to cron list');

    var fns = cron.get(new Date('Tue Nov 22 2016 17:27:00 GMT+0000 (GMT)'));
    assert.equal(fns.length, 1, 'Expected one function to be returned');
    assert.equal(typeof fns[0], 'function', 'Expected one function to be returned');

    fns[0].call(null, function (err) {
      assert.ok(err instanceof Error, 'Expected err to be an instance of Error');
      assert.equal(err.message, 'This is the error you are looking for');
      done();
    });
  });

  it('should handle invalid arguments to ON method', function () {
    var cron = new Cronfile();
    var err = null;

    try { cron.on('*/1 * * * *', 'hello world'); }
    catch (e) { err = e; }

    assert.ok(err instanceof TypeError, 'Expected err to be an instance of TypeError');
    assert.equal(err.message, 'Expected argument to be a function, found string');
  });

  it('should use a crontime over an alias', function () {
    var cron = new Cronfile();
    cron.aliases({ '*/1 * * * *': 'every_minute' });
    assert.deepEqual(cron._alias, { 'every_minute': '*/1 * * * *' });

    cron.on('every_minute', function () {});
    assert.equal(cron._crons.length, 1, 'Failed to attach cron function to cron list');
    assert.equal(cron._crons[0].raw_time, '*/1 * * * *');
  });

  it('should allow an array of functions', function () {
    var cron = new Cronfile();
    cron.on('*/1 * * * *', [ function () {}, function () {} ]);
    assert.equal(cron._crons.length, 1, 'Failed to attach cron function to cron list');
  });

  it('should set event functions with #on', function () {
    var cron = new Cronfile();
    cron.on('started', function () {});
    assert.equal(cron._crons.length, 0, 'Failed to attach listener function to events - instead attached to crons');
    assert.equal(cron._events.listenerCount('started'), 1, 'Failed to attach listener function to started event');
  });
});
