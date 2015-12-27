var rewire = require('rewire');

describe('Cronfile', function () {
  var cronFile = rewire('./cron');
  var CronClass = cronFile.__get__('Cron');

  process.argv.splice(2); // Deal with the Mocha arguments accordingly

  describe('Constructor', function () {

    it('should build a Cronfile object correctly', function () {
      var cron = new CronClass();
      cron.should.have.keys('_alias', '_crons', '_help', '_events');
      cron.should.have.property('_alias').and.eql({});
      cron.should.have.property('_crons').and.eql({});
      cron.should.have.property('_help').and.eql({});
      cron.should.have.property('_events').and.eql({});
    });

  });

  describe('#aliases', function () {

    it('should add the regular aliases correctly', function () {
      var cron = new CronClass();
      cron.aliases(require('./aliases.json'));
      cron.should.have.property('_alias').and.eql({
        '@annually': '0 0 1 1 *',
        '@daily': '0 0 * * *',
        '@hourly': '* */1 * * *',
        '@monthly': '0 0 1 * *',
        '@weekly': '0 0 * * 0',
        '@yearly': '0 0 1 1 *',
        'each_day': '0 0 * * *',
        'each_week': '0 0 * * 0',
        'every_day': '0 0 * * *',
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
        'every_week': '0 0 * * 0',
        'the_hour': '* */1 * * *'
      });
    });

  });

  describe('#on', function () {

    it('should add functions correctly', function () {
      var cron = new CronClass();
      var func = function someFunction(callback) {
        callback();
      };

      cron.on('some-timestamp', func);
      cron.should.have.property('_crons').and.have.property('some-timestamp').and.eql([ func ]);
    });

    it('should add functions under an alias correctly', function () {
      var cron = new CronClass();
      var func = function someHourlyFunction(callback) {
        callback();
      };

      cron.aliases({ '* */1 * * *': 'the_hour' });
      cron.on('the_hour', func);

      cron.should.have.property('_crons').and.have.property('* */1 * * *').and.eql([ func ]);
    });

    it('should add multiple functions correctly', function () {
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

    it('should add events correctly', function () {
      var cron = new CronClass();
      var func = function someStartFunction(callback) {
        callback();
      };

      cron.on('start', func);
      cron.should.have.property('_events').and.have.property('start').and.eql([ func ]);
    });

    it('should add descriptions correctly', function () {
      var cron = new CronClass();
      cron.on('*/1 * * * *', 'a lovely description of what this function is going to run', function (callback) {
        callback();
      });

      cron.should.have.property('_help').and.have.property('_crons').and.have.property('*/1 * * * *').and.eql([
        'a lovely description of what this function is going to run'
      ]);
    });

  });

  describe('#list', function () {
    it('should create a list of items correctly', function () {
      var cron = (new CronClass())
        .on('start', 'a description of the start event', function (callback) {
          callback();
        })
        .on('00 */1 * * *', 'a description of the hourly event', function (callback) {
          callback();
        })
        .on('stop', 'a description of the stop event', function (callback) {
          callback();
        });

      cron.list().should.be.a.String.and.eql([
        'start (1 event)',
        '- a description of the start event',
        '',
        '00 */1 * * * (1 event)',
        '- a description of the hourly event',
        '',
        'stop (1 event)',
        '- a description of the stop event',
      ].join('\n'));
    });

    it('should create another list of items correctly', function () {
      var cron = (new CronClass())
        .on('start', 'a description of the start event', function (callback) {
          callback();
        })
        .on('start', 'another description of the start event', function (callback) {
          callback();
        })
        .on('00 */1 * * *', 'a description of the hourly event', function (callback) {
          callback();
        })
        .on('00 */1 * * *', 'another description of the hourly event', function (callback) {
          callback();
        })
        .on('stop', 'a description of the stop event', function (callback) {
          callback();
        })
        .on('stop', 'another description of the stop event', function (callback) {
          callback();
        });

      cron.list().should.be.a.String.and.eql([
        'start (2 events)',
        '- a description of the start event',
        '- another description of the start event',
        '',
        '00 */1 * * * (2 events)',
        '- a description of the hourly event',
        '- another description of the hourly event',
        '',
        'stop (2 events)',
        '- a description of the stop event',
        '- another description of the stop event'
      ].join('\n'));
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
        .on('12 01 1 1 7', function (callback) {
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

    it('should force-run all the jobs jobs correctly: #run test', function (done) {
      var state = 'not-started';

      (new CronClass())
        .on('start', function () {
          state.should.eql('not-started');
          state = 'start';
        })
        .on('* * * * *', function () {
          state.should.eql('start');
          state = 'job';
        })
        .on('12 01 1 1 7', function () {
          state.should.eql('job');
          state = 'second-job';
        })
        .on('stop', function () {
          state.should.eql('second-job');
          state = 'stop';
        })
        .run([ 'test' ], function (err) {
          if (err) return done(err);

          state.should.eql('stop');
          done();
        });
    });

    it('should force-run jobs correctly: #run 12:50', function (done) {
      var state = 'not-started';
      cronFile.__set__('run', false);

      (new CronClass())
        .on('start', function () {
          state.should.eql('not-started');
          state = 'start';
        })
        .on('* * * * *', function () {
          state.should.eql('start');
          state = 'job';
        })
        .on('50 12 * * *', function () {
          state.should.eql('job');
          state = 'second-job';
        })
        .on('20 13 * * *', function () {
          throw new Error('This isn\'t the error you are looking for, move along');
        })
        .on('stop', function () {
          state.should.eql('second-job');
          state = 'stop';
        })
        .run([ '12:50' ], function (err) {
          if (err) return done(err);

          state.should.eql('stop');
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
