'use strict';

const Promise = require('bluebird');
let firstRun = true;

function getApp(component) {
  let app = component;
  while (app.parent) {
    app = app.parent;
  }
  return app;
}

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
  let app = getApp(component);
  app.controllerRoutes = app.controllerRoutes || {};

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

function _loadControllers(roots, controllers, component) {
  let app = getApp(component);

  return Promise.all(bolt
    .directoriesInDirectory(roots, ['controllers'])
    .map(dirPath => bolt.require.importDirectory(dirPath, {
      imports: controllers,
      callback: controllerPath => bolt.fire('loadedController', controllerPath)
    }))
  ).then(controllers => {
    controllers.forEach(
      controller => Object.keys(controller).forEach(
        controllerName => getRoutes(component, controller[controllerName], controllerName)
      )
    );
    return controllers;
  });
}

function loadControllers(roots, controllers, component) {
  if (firstRun) {
    firstRun = false;
    bolt.once('runApp', (options, app)=>{
      Object.keys(app.controllerRoutes).forEach(route => {
        app.controllerRoutes[route] = app.controllerRoutes[route].sort((a, b) =>
          ((a.priority > b.priority)?1:((a.priority < b.priority)?-1:0))
        );
      });
    });
  }
  return bolt.fire('loadControllers', component)
    .then(() => _loadControllers(roots, controllers, component))
    .then(() => bolt.fire('loadControllersDone', component))
    .then(() => getApp(component));
}

module.exports = {
	loadControllers
};