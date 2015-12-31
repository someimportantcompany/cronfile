var cron = require('./cron'); // But obviously you're gonna use "cronfile" when you're using the module

var queue = {
  create: function () {
    console.log('Queuing', arguments);

    return {
      save: function (callback) {
        callback();
      }
    };
  }
};

var request = {
  post: function (req, callback) {
    console.log('Requesting', req);
    callback();
  }
};

cron.on('every_five_minutes', 'Rebuild the content recommendations', function (callback) {
  queue.create('cron', {
    type: 'content-rec'
  }).save(callback);
});

cron.on('every_five_minutes', 'Rebuild the list of topics', function (callback) {
  queue.create('cron', {
    type: 'topics'
  }).save(callback);
});

cron.on('every_five_minutes', 'Rebuild the popular discussions list', function (callback) {
  queue.create('cron', {
    type: 'trending-discuss'
  }).save(callback);
});

cron.on('every_five_minutes', 'Rebuild the trending phrases', function (callback) {
  queue.create('cron', {
    type: 'trending-es'
  }).save(callback);
});

cron.on('every_ten_minutes', 'Queue the automation feeds', function (callback) {
  queue.create('cron', {
    type: 'queue-automated-feeds'
  }).save(callback);
});

cron.on('every_twenty_minutes', 'Rebuild the All & Editorial hot feeds', [
  function (callback) {
    queue.create('cron', {
      type: 'feed-all-hot'
    }).save(callback);
  },
  function (callback) {
    queue.create('cron', {
      type: 'feed-home-hot'
    }).save(callback);
  }
]);

cron.on('* */12 * * *', 'Rebuild the users leaderboard', function (callback) {
  request.post({
    url: 'https://api.myproject.com/rebuild-users-leaderboard',
    timeout: 3000
  }, callback);
});

cron.run();
