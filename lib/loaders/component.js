'use strict';

const path = require('path');
const Promise = require('bluebird');

function load(app, loaders, roots) {
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

      return Promise.all([
        loaders.templates.loadViewContent(dirPath, component.views), 
        loaders.controllers.load(dirPath, component.controllers),
        loaders.components.load(component, loaders, dirPath)
      ]);
    }).then(() => app);
}

module.exports = {
  load
};