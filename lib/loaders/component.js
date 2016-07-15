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

function _load(app, roots) {
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
          .then(() => bolt.loaders.controller.load(dirPath, component.controllers, component))
          .then(() => bolt.fire('loadComponentControllersDone', app)),
        bolt.fire('loadComponentComponents', app)
          .then(() => bolt.loaders.component.load(component, dirPath))
          .then(() => bolt.fire('loadComponentComponentsDone', app))
      ]);
    });
}

function load(app, roots=app.config.root) {
  return bolt.fire('loadComponents', app)
    .then(() => _load(app, roots))
    .then(() => Promise.all([
      bolt.fire('loadComponentsDone', app),
      !app.parent ? bolt.fire('loadAllComponentsDone', app) : Promise.resolve(app)
    ]))
    .then(() => app);
}

module.exports = {
  load
};