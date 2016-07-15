'use strict';

function _load(app, roots) {
  return bolt.directoriesInDirectory(roots, ['hooks'])
    .map(dirPath => bolt.require.importDirectory(dirPath))
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
    .then(() => bolt.fire('loadHooksDone', app))
    .then(() => app);
}

module.exports = {
  load
};