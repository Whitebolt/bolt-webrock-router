'use strict';

function _addMethodProperties(middleware, middlewareName) {
  let method = middleware[middlewareName];
  method.id = middlewareName;
  method.priority = parseInt(method.priority || 0, 10);
  return middleware[middlewareName];
}

function _loadMiddleware(app, roots, importObj) {
  return bolt.importIntoApp({
    roots, importObj, dirName:'middleware', eventName:'loadedMiddleware'
  })
    .then(middleware=>middleware[0])
    .then(middleware=>Object.keys(middleware)
        .map(middlewareName => _addMethodProperties(middleware, middlewareName))
        .sort(bolt.prioritySorter)
    )
    .then(middleware=>{
      middleware.forEach(middleware => {
        bolt.fire('ranMiddleware', middleware.id.replace(/^\d+_/, ''));
        middleware(app);
      });
      return app
    });
}


function loadMiddleware(app, roots=app.config.root, middleware=app.middleware) {
  return bolt.fire(()=>_loadMiddleware(app, roots, middleware), 'loadMiddleware', app).then(() => app);
}

module.exports = {
  loadMiddleware
};
