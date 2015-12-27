# Future Features

Here's a simple list of upcoming features that `cronfile` will have implemented in the near future.

If you have any suggestions please [open an issue][issues] and if you'd like to get involved with any of the discussions
for new features check [the todo tag][todos] :smile:

And of course, if you'd like to implement any of these features then feel free to submit a pull-request!

- [x] Ability to run specific cron operations on command

```sh
$ node cronfile.js 12:50 # Would execute any matching TODAY 12:50
```

- [x] Ability to list all the cron operations this file could execute

```
$ node cronfile.js list
*/1 * * * *
  - The thing that runs every minute
*/5 * * * *
  - The thing that runs every five minutes
  - And this thing.
  - And don't forget about this thing too!
```

- [ ] Locking

At the moment the use-case is simply to add cron operations to a queue. However, this may not be the case for all
applications of this module. Therefore, this module should implement an independent locking mechanism (ideally not
relying on any external sources (cache, database, etc) (most probably file-based) to prevent the cron from executing
multiple instances.

```
- cronfile.js
- cronfile.lock
```

- [ ] Simplified notifications to common sources

C'mon, everything hooks into Slack easily these days, right?

```
var request = require('request');

cron.notify(message, callback) {
  request.post({
    url: 'https://slack.com/api/hook/teamid/hookid/or/something',
    body: {
      text: message
    }
    json: true
  }, callback);
});
```

[issues]: https://github.com/jdrydn/cronfile/issues
[todos]: https://github.com/jdrydn/cronfile/labels/todo
