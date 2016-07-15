'use strict';

global.boltRootDir = __dirname;

function importLoaders(dirPath, importObj) {
  return bolt.require.importDirectory(dirPath, {imports: bolt.loaders})
    .then(()=> bolt.fire('loadersImported', importObj))
}

require('./lib/').then(bolt => {
  bolt.loaders = {};

  bolt.hook('loadersImported', () => {
    bolt.loaders.app.load(process.argv[2]);
  });

  bolt.hook('initialiseAppDone', (hook, app) => {
    bolt.loaders.database.load(app);
  });

  bolt.hook('loadDatabasesDone', (hook, app) => {
    bolt.loaders.middleware.load(app);
  });

  bolt.hook('loadMiddlewareDone', (hook, app) => {
    bolt.loaders.route.load(app);
  });

  bolt.hook('loadRoutesDone', (hook, app) => {
    bolt.loaders.component.load(app);
  });

  bolt.hook('loadAllComponentsDone', (hook, app) => {
    bolt.loaders.template.load(app);
  });

  bolt.hook('loadTemplatesDone', (hook, app) => {
    bolt.loaders.run(app);
  });

  importLoaders('./lib/loaders/');
});
