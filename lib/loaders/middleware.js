'use strict';

const Promise = require('bluebird');

/**
 *  @todo This is not ideal, rework somehow.  Can we just load all and ignore order?
 *        We can do this via a number in filename (AKA Debian style).  Also, only 
 *        loading from main root not all roots.
 */


function load(app, roots, middleware) {
  return bolt
    .directoriesInDirectory(roots, ['middleware'])
    .each(dirPath => bolt.importDirectory(dirPath, middleware, 'js', middlewarePath => {
      console.log('[' + ' load '.green + '] ' + 'middleware ' + middlewarePath.italic.yellow);
    }))
    .then(dirPaths =>  { 
      Object.keys(middleware).sort().forEach(middlewareName => {
        console.log('[' + ' run '.green + '] ' + 'middleware ' + middlewareName.replace(/^\d+_/, '').cyan);
        middleware[middlewareName](app);
      });
      return middleware;
    });
}
module.exports = {
  load
};