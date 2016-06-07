'use strict';

const Promise = require('bluebird');

/**
 *  @todo This is not ideal, rework somehow.  Can we just load all and ignore order?
 *        We can do this via a number in filename (AKA Debian style).  Also, only 
 *        loading from main root not all roots.
 */


function load(app, roots, middleware) {
  return Promise.all(bolt
    .directoriesInDirectory(roots, ['middleware'])
    .map(dirPath => bolt.require.importDirectory(dirPath, {
        imports: middleware,
        callback: middlewarePath => {
          console.log('[' + colour.green(' load ') + '] ' + 'middleware ' + colour.italic.yellow(middlewarePath));
        }
    }))).then(() => {
      Object.keys(middleware).sort().forEach(middlewareName => {
        console.log('[' + colour.green(' run ') + '] ' + 'middleware ' + colour.cyan(middlewareName.replace(/^\d+_/, '')));
        middleware[middlewareName](app);
      });
      return app
    });
}
module.exports = {
  load
};
