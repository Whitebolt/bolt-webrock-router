'use strict';

const Promise = require('bluebird');


function _loadHooks(app, roots) {
  return bolt.directoriesInDirectory(roots, ['hooks'])
    .map(dirPath => bolt.require.importDirectory(dirPath, {
      callback: hookPath=>bolt.fire('loadedHook', hookPath)
    }))
    .each(hooks =>
      Object.keys(hooks).forEach(hookName =>
        hooks[hookName].forEach(hook => {
          let params = Object.assign(bolt._eventDefaultParams, hook);
          return bolt.hook(hookName, hook, params);
        })
      )
    );
}

function loadHooks(app, roots=app.config.root) {
  return bolt.fire('loadHooks', app)
    .then(() => _loadHooks(app, roots))
    .then(() => Promise.all([
      bolt.fire('loadHooksDone', app),
      !app.parent ? bolt.fire('loadRootHooksDone', app) : Promise.resolve(app)
    ]))
    .then(() => app);
}

module.exports = {
  loadHooks
};