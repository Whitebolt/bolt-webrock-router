'use strict';

global.boltRootDir = __dirname;
global.colour = require('colors');
global.express = require('express');
global.bolt = Object.assign(require('lodash'));

require('require-extra').importDirectory('./bolt/', {
  merge: true,
  imports: bolt
}).then(bolt => {
  bolt.hook('afterInitialiseApp', (hook, configPath, app) => bolt.loadHooks(app));
  bolt.loadApplication(process.argv[2]);
});
