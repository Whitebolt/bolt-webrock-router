'use strict';

function _addMethodProperties(routers, routerName) {
  let method = routers[routerName];
  let priority = (method.hasOwnProperty('priority') ? method.priority : 10);
  method.id = routerName;
  method.priority = parseInt(priority, 10);
  method.route = method.route || '/*';
  method.method = method.method || 'all';
  return routers[routerName];
}

function _loadRoutes(app, roots) {
  return bolt
    .importIntoObject({roots, dirName:'routers', eventName:'loadedRouter'})
    .then(routers=>routers[0])
    .then(routers=>Object.keys(routers)
      .map(routerName => _addMethodProperties(routers, routerName))
      .sort(bolt.prioritySorter)
    )
    .then(routers=>{
      console.log(routers);
      routers.forEach(routerBuilder=>{
        let routers = bolt.makeArray(routerBuilder(app));
        routers.forEach(router=>{
          app[routerBuilder.method](routerBuilder.route, router);
        });
      });
    });
}

function loadRoutes(app) {
  return bolt.fire(()=>_loadRoutes(
    app, app.config.root || [], app.routes
  ), 'loadRoutes', app).then(() => app);
}

module.exports = {
  loadRoutes
};