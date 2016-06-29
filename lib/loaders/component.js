'use strict';

const path = require('path');
const Promise = require('bluebird');

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

      return Promise.all([
        bolt.runHook('loadComponentControllers', app)
          .then(() => loaders.controller.load(dirPath, component.controllers, component))
          .then(() => bolt.runHook('loadComponentControllersDone', app)),
        bolt.runHook('loadComponentComponents', app)
          .then(() => loaders.component.load(component, loaders, dirPath))
          .then(() => bolt.runHook('loadComponentComponentsDone', app))
      ]);
    });
}

function load(app, loaders, roots) {
  return bolt.runHook('loadComponents', app)
    .then(() => _load(app, loaders, roots))
    .then(() => bolt.runHook('loadComponentsDone', app))
    .then(() => app);
}

module.exports = {
  load
};