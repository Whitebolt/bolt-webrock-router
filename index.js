'use strict';

require('colors');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

require('require-extra')('./lib/bolt/').then(bolt => {
  global.bolt = bolt;
  global.express = require('express');

  return bolt.require(['./lib/loaders', process.argv[2]]);
}).spread((loaders, config) => {
  const app = express();
  app.config = config;
  app.config.template = app.config.template || 'index';

  /**
   * @todo These should all load at once instead of in sequence.
   */
  loaders.databases.load(app).then(() => {
    app.middleware = app.middleware || {};
    return loaders.middleware.load(app, app.config.root, app.middleware);
  }).then(() => {
    return loaders.routes.load(app);
  }).then(() => {
    app.controllers = app.controllers || {};
    return loaders.controllers.load(app.config.root, app.controllers);
  }).then(() => {
    app.templates = app.templates || {};
    return loaders.templates.load(app.config.root, app.templates);
  }).then(() => {
    app.listen(app.config.port, () => {
      console.log('[' + ' listen '.green + '] ' + 'Bolt Server on port ' + app.config.port.toString().green + '\n\n');
      readFile('./welcome.txt', 'utf-8').then(welcome => {
        console.log(welcome);
        console.log('\n'+Date().toLocaleString());

      });      
    });
  });
});
