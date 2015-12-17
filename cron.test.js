var rewire = require('rewire');

describe('Cronfile', function () {
  var cronFile = rewire('./cron');
  var CronClass = cronFile.__get__('Cron');

  describe('Constructor', function () {

    it('should build a Cronfile object correctly', function () {
      var cron = new CronClass();
      cron.should.have.keys('_alias', '_crons', '_events');
      cron.should.have.property('_alias').and.eql({});
      cron.should.have.property('_crons').and.eql({});
      cron.should.have.property('_events').and.eql({});
    });

  });

  describe('#aliases', function () {

    it('should add the regular aliases correctly', function () {
      var cron = new CronClass();
      cron.aliases(require('./aliases.json'));
      cron.should.have.property('_alias').and.eql({
        '@annally': '0 0 1 1 *',
        '@hourly': '* */1 * * *',
        '@monthly': '0 0 1 * *',
        '@weekly': '0 0 * * *',
        '@yearly': '0 0 1 1 *',
        'each_week': '0 0 * * *',
        'every_fifteen_minutes': '*/15 * * * *',
        'every_five_minutes': '*/5 * * * *',
        'every_hour': '* */1 * * *',
        'every_minute': '*/1 * * * *',
        'every_ten_minutes': '*/10 * * * *',
        'every_thirty_minutes': '*/30 * * * *',
        'every_three_hours': '* */3 * * *',
        'every_twenty_minutes': '*/20 * * * *',
        'every_two_hours': '* */2 * * *',
        'every_two_minutes': '*/2 * * * *',
        'every_week': '0 0 * * *',
        'the_hour': '* */1 * * *'
      });
    });

  });

  describe('#on', function () {

    it('should add Cron functions correctly', function () {
      var cron = new CronClass();
      var func = function someFunction(callback) {
        callback();
      };

      cron.on('some-timestamp', func);
      cron.should.have.property('_crons').and.have.property('some-timestamp').and.eql([ func ]);
    });

    it('should add Cron functions under an alias correctly', function () {
      var cron = new CronClass();
      var func = function someHourlyFunction(callback) {
        callback();
      };

      cron.aliases({ '* */1 * * *': 'the_hour' });
      cron.on('the_hour', func);

      cron.should.have.property('_crons').and.have.property('* */1 * * *').and.eql([ func ]);
    });

    it('should add multiple Cron functions correctly', function () {
      var cron = new CronClass();
      var funcs = [
        function someFunction(callback) {
          callback();
        },
        function anotherFunction(callback) {
          callback();
        }
      ];

      cron.on('some-timestamp', funcs);
      cron.should.have.property('_crons').and.have.property('some-timestamp').and.eql(funcs);
    });

    it('should add Cron events correctly', function () {
      var cron = new CronClass();
      var func = function someStartFunction(callback) {
        callback();
      };

      cron.on('start', func);
      cron.should.have.property('_events').and.have.property('start').and.eql([ func ]);
    });

  });

  describe('#run', function () {
    beforeEach(function () {
      cronFile.__set__('run', false);
    });

    it('should run nothing if no functions are added', function (done) {
      (new CronClass()).run(done);
    });

    it('should return an error if you try to run the cron twice', function (done) {
      var cron = new CronClass();

      cron.run(function (err) {
        if (err) return done(err);

        cron.run(function (err) {
          if (!err) return done(new Error('Shoulda errored'));

          err.should.be.an.Error.with.property('message').and.eql('You cannot run the Cron library twice');
          done();
        });
      });
    });

    it('should run the start function as expected', function (done) {
      var ranStart = false;
      (new CronClass())
        .on('start', function (callback) {
          ranStart = true;
          callback();
        })
        .run(function (err) {
          if (err) return done(err);

          ranStart.should.be.true;
          done();
        });
    });

    it('should run the stop function as expected', function (done) {
      var ranStop = false;
      (new CronClass())
        .on('stop', function (callback) {
          ranStop = true;
          callback();
        })
        .run(function (err) {
          if (err) return done(err);

          ranStop.should.be.true;
          done();
        });
    });

    it('should run jobs correctly', function (done) {
      var state = null;
      (new CronClass())
        .on('start', function (callback) {
          (state === null).should.be.true;
          state = 'start';
          callback();
        })
        .on('* * * * *', function (callback) {
          (state === 'start').should.be.true;
          state = 'job';
          callback();
        })
        .on('12 01 1 1 *', function (callback) {
          callback(new Error('This isn\'t the error you are looking for, move along'));
        })
        .on('stop', function (callback) {
          (state === 'job').should.be.true;
          state = 'stop';
          callback();
        })
        .run(function (err) {
          if (err) return done(err);

          (state === 'stop').should.be.true;
          done();
        });
    });
  });

  describe('#stop', function () {
    beforeEach(function () {
      cronFile.__set__('run', false);
    });

    it('should run nothing if no functions are added', function (done) {
      (new CronClass()).stop(done);
    });

    it('should only run the stop functions', function (done) {
      (new CronClass())
        .on('start', function (callback) {
          callback(new Error('This isn\'t the error you are looking for, move along'));
        })
        .on('* * * * *', function (callback) {
          callback(new Error('This isn\'t the error you are looking for, move along'));
        })
        .on('stop', function (callback) {
          callback(new Error('Stop that ship! Blast them!'));
        })
        .stop(function (err) {
          if (!err) return done(new Error('Shoulda errored'));

          err.should.be.an.Error.with.property('message').and.eql('Stop that ship! Blast them!');
          done();
        });
    });
  });
});
