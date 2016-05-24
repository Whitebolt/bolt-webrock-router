'use strict';

const path = require('path');
const Promise = require('bluebird');

function load(app, roots, loaders) {
  app.components = app.components || {};

  return bolt
    .directoriesInDirectory(roots, ['components'])
    .map(dirPath => bolt.directoriesInDirectory(dirPath))
    .then(dirPaths => bolt.flatten(dirPaths))
    .map(dirPath => {
      let componentName = path.basename(dirPath);
      app.components[componentName] = app.components[componentName] || {};
      let component = app.components[componentName];

      return Promise.all([
        loaders.templates.load(component, dirPath),
        loaders.controllers.load(component, dirPath),
        loaders.components.load(component, dirPath, loaders)
      ]);
    })
}

module.exports = {
  load
};