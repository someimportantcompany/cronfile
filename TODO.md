# Future Features

Here's a simple list of upcoming features that `cronfile` will have implemented in the near future.

If you have any suggestions please [open an issue][issues] and if you'd like to get involved with any of the discussions
for new features check [the todo tag][todos] :smile:

And of course, if you'd like to implement any of these features then feel free to submit a pull-request!

- [ ] Ability to run specific cron operations on command
- [ ] Ability to list all the cron operations this file has queued
- [ ] Locking  
  At the moment the use-case is simply to add cron operations to a queue. However, this may not be the case for all
  applications of this module. Therefore, this module should implement an independent locking mechanism (ideally not
  relying on any external sources (cache, database, etc) (most probably file-based) to prevent the cron from executing
  multiple instances.
- [ ] Simplified notifications to common sources  
  C'mon, everything hooks into Slack easily these days, right?

[issues]: https://github.com/jdrydn/cronfile/issues
[todos]: https://github.com/jdrydn/cronfile/labels/todo
