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
      return Object.keys(middleware).map(middlewareName => {
        let method = middleware[middlewareName];
        method.id = middlewareName;
        method.priority = parseInt(method.priority || 0, 10);
        return middleware[middlewareName];
      }).sort((a, b) => ((a.priority > b.priority)?1:((a.priority < b.priority)?-1:0)));
    }).then(middleware => {
      middleware.forEach(middleware => {
        console.log('[' + colour.green(' run ') + '] ' + 'middleware ' + colour.cyan(middleware.id.replace(/^\d+_/, '')));
        middleware(app);
      });
      return app
    });
}
module.exports = {
  load
};
