'use strict';

global.boltRootDir = __dirname;
global.colour = require('colors');
global.express = require('express');
global.bolt = Object.assign(require('lodash'));

let configDone = false;

process.on('message', message=>{
  if ((message.type === 'config') && !configDone) {
    configDone = true;

    console.log(message.data);
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

