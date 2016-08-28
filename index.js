'use strict';

const pm2 = require('bluebird').promisifyAll(require('pm2'));

pm2.connectAsync().then(()=>{
  return pm2.start({
    script    : './index.js',
    name: "lukehowellsmagic.co.uk",
    args: "'~/Projects/www/lukehowellsmagic/server.json'",
    cwd: './',
    output: '~/Projects/www/lukehowellsmagic/logs/console.log',
    error: '~/Projects/www/lukehowellsmagic/logs/error.log'
  }).then(apps=>{
    console.log("RUNNING");
  }, err=>{
    pm2.disconnect();
    if (err) throw err;
  });
}, err=>{
  console.error(err);
  process.exit(2);
});