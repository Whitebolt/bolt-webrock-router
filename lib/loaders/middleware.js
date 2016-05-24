'use strict';

const Promise = require('bluebird');
const colour = require('colors');

/**
 *  @todo This is not ideal, rework somehow.  Can we just load all and ignore order?
 *        We can do this via a number in filename (AKA Debian style).  Also, only 
 *        loading from main root not all roots.
 */


function load(app, roots) {
  app.middleware = app.middleware || {};
  let middleware = app.middleware;

  return bolt
    .directoriesInDirectory(roots, ['middleware'])
    .each(dirPath => bolt.importDirectory(dirPath, middleware, 'js', middlewarePath => {
      console.log('[' + colour.green(' load ') + '] ' + 'middleware ' + colour.yellow.italic(middlewarePath));
    }))
    .then(dirPaths =>  { 
      Object.keys(middleware).sort().forEach(middlewareName => {
        console.log('[' + colour.green(' run ') + '] ' + 'middleware ' + colour.cyan(middlewareName.replace(/^\d+_/, '')));
        middleware[middlewareName](app);
      });
      return middleware;
    });
}
module.exports = {
  load
};