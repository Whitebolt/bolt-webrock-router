'use strict';

global.boltRootDir = __dirname;
global.colour = require('colors');
global.express = require('express');
global.bolt = Object.assign(require('lodash'));

let configDone = false;

process.on('message', message=>{
  if ((message.type === 'config') && !configDone) {
    configDone = true;
    launcher(message.data);
  }
});


function launcher(config) {
  require('require-extra').importDirectory('./bolt/', {
    merge: true,
    imports: bolt
  }).then(bolt => {
    bolt.hook('afterInitialiseApp', (hook, configPath, app) => bolt.loadHooks(app));
    bolt.loadApplication(config);
  });
}



/*if (process.argv.length > 2) {
  launcher(process.argv[2]);
} else {
  let stdin = process.stdin;
  let pipedJsonText = "";

  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', chunk=>{pipedJsonText+=chunk;});
  stdin.on('end', ()=>launcher(JSON.parse(pipedJsonText)));
}*/

