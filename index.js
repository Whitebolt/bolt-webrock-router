'use strict';

const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const loaders = {};

/**
 * @todo These should all load at once instead of in sequence.
 */
require('./lib/')
  .then(() => bolt.require.importDirectory('./lib/loaders/', {imports: loaders}))
  .then(loaders => loaders.app.load(process.argv[2]))
  .then(app => loaders.database.load(app))
  .then(app => loaders.middleware.load(app, app.config.root, app.middleware))
  .then(app => loaders.route.load(app))
  .then(app => loaders.component.load(app, loaders, app.config.root))
  .then(app => loaders.template.load(app))
  .then(app => {
    app.listen(app.config.port, () => {
      console.log('[' + ' listen '.green + '] ' + 'Bolt Server on port ' + app.config.port.toString().green + '\n\n');
      readFile('./welcome.txt', 'utf-8').then(welcome => {
        console.log(welcome);
        console.log('\n'+'[' + ' load complete '.green + '] ' +Date().toLocaleString());

      });
  });
});

/*}).then(app => {
 return loaders.template.loadViewContent(app.config.root, app.templates).then(() => app);
 }).then(app => {
 return loaders.template.load(app.config.root, app.templates, app.config.template).then(() => app);
 }).then(app => {
 return loaders.template.compileAllViews(app);*/
