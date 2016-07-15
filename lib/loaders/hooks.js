'use strict';

const Promise = require('bluebird');


function _load(app, roots) {
  return bolt.directoriesInDirectory(roots, ['hooks'])
    .map(dirPath => bolt.require.importDirectory(dirPath, {
      callback: hookPath=>bolt.fire('loadedHook', hookPath)
    }))
    .each(hooks =>
      Object.keys(hooks).forEach(hookName =>
        hooks[hookName].forEach(hook =>
          (Array.isArray(hook)) ? bolt.hook(hookName, hook[0], hook[1]) : bolt.hook(hookName, hook)
        )
      )
    );
}

function load(app, roots=app.config.root) {
  return bolt.fire('loadHooks', app)
    .then(() => _load(app, roots))
    .then(() => Promise.all([
      bolt.fire('loadHooksDone', app),
      !app.parent ? bolt.fire('loadRootHooksDone', app) : Promise.resolve(app)
    ]))
    .then(() => app);
}

module.exports = {
  load
};