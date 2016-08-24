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

function _loadComponents(app, roots) {
  app.components = app.components || {};

  return bolt
    .directoriesInDirectory(roots, ['components'])
    .map(dirPath => bolt.directoriesInDirectory(dirPath))
    .then(dirPaths => bolt.flatten(dirPaths))
    .map(dirPath => {
      let componentName = path.basename(dirPath);
      bolt.addDefaultObjects(app.components, componentName);
      let component = bolt.addDefaultObjects(app.components[componentName], ['controllers', 'views']);
      component.parent = app;
      component.name = componentName;
      component.path = getComponentPath(component, componentName);

      return Promise.all([
        bolt.fire(() => bolt.loadHooks(component, dirPath), 'loadComponentHooks', app),
        bolt.fire(() => bolt.loadControllers(component, dirPath), 'loadComponentControllers', app),
        bolt.fire(() => bolt.loadComponents(component, dirPath), 'loadComponentComponents', app)
      ]);
    });
}

function loadComponents(app, roots=app.config.root) {
  let fireEvent = 'loadComponents' + (!app.parent?',loadAllComponents':'');
  return bolt.fire(()=>_loadComponents(app, roots), fireEvent, app).then(() => app);
}

module.exports = {
  loadComponents
};