'use strict';

const Promise = require('bluebird');


function _load(app, roots, middleware) {
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


function load(app, roots, middleware) {
  return bolt.fire('loadMiddleware', app)
    .then(() => _load(app, roots, middleware))
    .then(() => bolt.fire('loadMiddlewareDone', app))
    .then(() => app);
}

module.exports = {
  load
};
