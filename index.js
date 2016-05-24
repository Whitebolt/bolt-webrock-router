'use strict';

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
    return loaders.middleware.load(app);
  }).then(() => {
    return loaders.routes.load(app);
  }).then(() => {
    app.controllers = app.controllers || {};
    return loaders.controllers.load(app.config.root, app.controllers);
  }).then(() => {
    app.templates = app.templates || {};
    return loaders.templates.loadTemplates(app.config.root, app.templates);
  }).then(() => {
    app.listen(app.config.port, () => {
      console.log('Express Listening on port ' + app.config.port);
    });
  });
});
