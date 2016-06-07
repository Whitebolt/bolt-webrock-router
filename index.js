'use strict';

const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

require('./lib/').then(() => {
  return bolt.require('./lib/loaders');
}).then(loaders => {
  /**
   * @todo These should all load at once instead of in sequence.
   */
  loaders.app.load(process.argv[2]).then(app => {
    return loaders.databases.load(app);
  }).then(app => {
    return loaders.middleware.load(app, app.config.root, app.middleware);
  }).then(app => {
    return loaders.routes.load(app);
  }).then(app => {
    return loaders.components.load(app, loaders, app.config.root);
  }).then(app => {
    return loaders.templates.loadViewContent(app.config.root, app.templates).then(() => app);
  }).then(app => {
    return loaders.templates.load(app.config.root, app.templates, app.config.template).then(() => app);
  }).then(app => {
    return loaders.templates.compileAllViews(app);
  }).then(app => {
    app.listen(app.config.port, () => {
      console.log('[' + ' listen '.green + '] ' + 'Bolt Server on port ' + app.config.port.toString().green + '\n\n');
      readFile('./welcome.txt', 'utf-8').then(welcome => {
        console.log(welcome);
        console.log('\n'+'[' + ' load complete '.green + '] ' +Date().toLocaleString());

      });
    });
  });
});
