var cron = require('./lib/cron');
cron.aliases(require('./lib/aliases.json'));
/**
 * I have always hated these little individual files, literally taking one file and re-exporting it
 * Turns out, in this situation it's needed, due to the way node require's modules
 *
 * Take two files: "cronfile" and "./lib/cron.js"
 * With package.json, "cronfile" => "./lib/cron.js", easy
 * But then referring it internally, "../lib/cron", doesn't work since "cronfile" has been cached somewhere else
 * So to get around that, we have to force node to cache our actual cron lib as a file, not a module
 */
module.exports = cron;
