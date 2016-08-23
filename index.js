'use strict';

global.boltRootDir = __dirname;

require('./lib/').then(bolt => {
  bolt.hook('afterInitialiseApp', (hook, configPath, app) => bolt.loadHooks(app));
  bolt.loadApplication(process.argv[2]);
});
