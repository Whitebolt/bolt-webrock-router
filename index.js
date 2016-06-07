'use strict';


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
  .then(app => loaders.run(app));

/*}).then(app => {
 return loaders.template.loadViewContent(app.config.root, app.templates).then(() => app);
 }).then(app => {
 return loaders.template.load(app.config.root, app.templates, app.config.template).then(() => app);
 }).then(app => {
 return loaders.template.compileAllViews(app);*/
