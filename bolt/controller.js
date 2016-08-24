'use strict';

const Promise = require('bluebird');


function getMethodPaths(methodPath) {
  let methodPaths = [methodPath];
  let cLength = methodPath.length;
  let cPath = bolt.replaceLast(methodPath, '/index', '');
  while (cPath.length !== cLength) {
    methodPaths.push(cPath);
    cLength = cPath.length;
    cPath = bolt.replaceLast(cPath, '/index', '');
  }
  return methodPaths;
}

function getRoutes(component, controller, controllerName) {
  let app = bolt.getApp(component);
  bolt.addDefaultObjects(app, "controllerRoutes");

  Object.keys(controller).map(name => {
    let methodPath = component.path + '/' + controllerName + '/' + name;
    getMethodPaths(methodPath).forEach((methodPath, priority) => {
      let _methodPath = methodPath.length?methodPath:'/';
      app.controllerRoutes[_methodPath] = app.controllerRoutes[_methodPath] || [];
      let method = controller[name];
      method.componentName = component.name;
      method.methodPath = methodPath;
      app.controllerRoutes[_methodPath].push({method: controller[name], name, priority});
    });
  });

  return app.controllerRoutes;
}

function _loadControllers(roots, importObj, component) {
  let app = bolt.getApp(component);

  return bolt.importIntoApp({
    roots, importObj, dirName:'controllers', eventName:'loadedController'
  }).then(controllers => {
    controllers.forEach(
      controller => Object.keys(controller).forEach(
        controllerName => getRoutes(component, controller[controllerName], controllerName)
      )
    );
    return controllers;
  });
}

function  _addControllerRoutes(component) {
  let app = bolt.getApp(component);

  if (!app._controllerRoutesSorted) {
    app._controllerRoutesSorted = true;
    bolt.once('beforeRunApp', (options, app)=>{
      Object.keys(app.controllerRoutes).forEach(route => {
        app.controllerRoutes[route] = app.controllerRoutes[route].sort(bolt.prioritySorter);
      });
    });
  }
}

function loadControllers(roots, controllers, component) {
  _addControllerRoutes(component);
  return bolt.fire(()=>_loadControllers(roots, controllers, component), 'loadControllers', component)
    .then(() => bolt.getApp(component));
}

module.exports = {
	loadControllers
};