'use strict';

const Promise = require('bluebird');

function getApp(component) {
  let app = component;
  while (app.parent) {
    app = app.parent;
  }
  return app;
}

function getComponentPath(component) {
  let componentPath = [component.name];
  while (component.parent) {
    component = component.parent;
    componentPath.push(component.name);
  }
  return componentPath.join('/');
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

function getRoutes(component, controller) {
  let app = getApp(component);
  app.controllerRoutes = app.controllerRoutes || {};
  let compontentPath = getComponentPath(component);

  Object.keys(controller).map(name => {
    let methodPath = '/' + compontentPath + name;
    getMethodPaths(methodPath).forEach((methodPath, priority) => {
      let _methodPath = methodPath.length?methodPath:'/';
      app.controllerRoutes[_methodPath] = app.controllerRoutes[_methodPath] || [];
      app.controllerRoutes[_methodPath].push({method: controller[name], name, priority});
    });
  });

  return app.controllerRoutes;
}

function _load(roots, controllers, component) {
  let app = getApp(component);

  return Promise.all(bolt
    .directoriesInDirectory(roots, ['controllers'])
    .map(dirPath => bolt.require.importDirectory(dirPath, {
      imports: controllers,
      callback: controllerPath => {
        console.log('[' + colour.green(' load ') + '] ' + 'controller ' + colour.yellow(controllerPath));
      }
    }))
  ).then(controllers => {
    Object.keys(controllers).forEach(controllerName => getRoutes(component, controllers[controllerName]));
    return controllers;
  });
}

function load(roots, controllers, component) {
  return bolt.runHook('loadControllers', component)
    .then(() => _load(roots, controllers, component))
    .then(() => bolt.runHook('loadControllersDone', component))
    .then(() => getApp(component));
}

module.exports = {
	load
};