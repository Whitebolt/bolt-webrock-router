'use strict';

const path = require('path');
const Promise = require('bluebird');

function getComponentPath(component) {
  let compPath = [component.name];
  while (component.parent) {
    component = component.parent;
    compPath.unshift(component.name);
  }
  return compPath.join('/');
}

function _load(app, loaders, roots) {
  app.components = app.components || {};

  return bolt
    .directoriesInDirectory(roots, ['components'])
    .map(dirPath => bolt.directoriesInDirectory(dirPath))
    .then(dirPaths => bolt.flatten(dirPaths))
    .map(dirPath => {
      let componentName = path.basename(dirPath);
      app.components[componentName] = app.components[componentName] || {};
      let component = app.components[componentName];
      component.controllers = component.controllers || {};
      component.views = component.views || {};
      component.parent = app;
      component.name = componentName;
      component.path = getComponentPath(component, componentName);

      return Promise.all([
        bolt.fire('loadComponentControllers', app)
          .then(() => loaders.controller.load(dirPath, component.controllers, component))
          .then(() => bolt.fire('loadComponentControllersDone', app)),
        bolt.fire('loadComponentComponents', app)
          .then(() => loaders.component.load(component, loaders, dirPath))
          .then(() => bolt.fire('loadComponentComponentsDone', app))
      ]);
    });
}

function load(app, loaders, roots) {
  return bolt.fire('loadComponents', app)
    .then(() => _load(app, loaders, roots))
    .then(() => bolt.fire('loadComponentsDone', app))
    .then(() => app);
}

module.exports = {
  load
};