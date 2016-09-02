'use strict';

const pm2 = require('bluebird').promisifyAll(require('pm2'));
const config = {
  "script": "/home/simpo/Projects/bolt2/app.js",
  "name": "lukehowellsmagic.co.uk",
  "args": "'/home/simpo/Projects/www/lukehowellsmagic/server.json'",
  "cwd": "/home/simpo/Projects/www/lukehowellsmagic/",
  "out_file": "/home/simpo/Projects/www/lukehowellsmagic/logs/console.log",
  "error_file": "/home/simpo/Projects/www/lukehowellsmagic/logs/error.log"
};

pm2.connectAsync()
  .then(()=>pm2.listAsync())
  .filter(apps=>(apps.name === config.name))
  .then(apps=>{if (apps.length) return pm2.deleteAsync(config.name);})
  .then(result=>pm2.startAsync(config))
  .then(result=>pm2.disconnect(), err=>{throw err;})