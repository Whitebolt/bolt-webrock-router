'use strict';

const Promise = require('bluebird');


function _load(app, roots) {
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