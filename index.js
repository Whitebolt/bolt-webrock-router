'use strict';

global.boltRootDir = __dirname;

const loaders = {};

function importLoaders(dirPath, importObj) {
  return bolt.require.importDirectory(dirPath, {imports: importObj})
    .then(()=> bolt.fire('loadersImported', importObj))
}

require('./lib/').then(bolt => {
  bolt.hook('loadersImported', () => {
    loaders.app.load(process.argv[2]);
  });

  bolt.hook('initialiseAppDone', (hook, app) => {
    loaders.database.load(app);
  });

  bolt.hook('loadDatabasesDone', (hook, app) => {
    loaders.middleware.load(app, app.config.root, app.middleware);
  });

  bolt.hook('loadMiddlewareDone', (hook, app) => {
    loaders.route.load(app);
  });

  bolt.hook('loadRoutesDone', (hook, app) => {
    loaders.component.load(app, loaders, app.config.root);
  });

  bolt.hook('loadAllComponentsDone', (hook, app) => {
    loaders.template.load(app);
  });

  bolt.hook('loadTemplatesDone', (hook, app) => {
    loaders.run(app);
  });

  importLoaders('./lib/loaders/', loaders);
});
