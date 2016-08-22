'use strict';

global.boltRootDir = __dirname;

function importLoaders(dirPath, importObj) {
  return bolt.require.importDirectory(dirPath, {imports: bolt.loaders})
    .then(()=> bolt.fire('loadersImported', importObj))
}

require('./lib/').then(bolt => {
  bolt.loaders = {};
  bolt.hook('loadersImported', () => bolt.loaders.app.load(process.argv[2]));
  bolt.hook('afterInitialiseApp', (hook, configPath, app) => bolt.loaders.hooks.load(app));
  importLoaders('./lib/loaders/');
});
