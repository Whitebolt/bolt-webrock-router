'use strict';

const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const path = require('path');

function loadTextFile(filename) {
  return readFile(filename, 'utf8');
}

function loadViewContent(roots, views = {}) {
  return bolt.directoriesInDirectory(roots, ['views']).map(viewPath => {
    return bolt.filesInDirectory(viewPath, 'ejs')
      .then(viewPaths => bolt.flatten(viewPaths)) // @todo Is this needed here?
      .map(viewPath => {
        let viewName = path.basename(viewPath, '.ejs');
        return readFile(viewPath, 'utf8').then(viewTxt => {
          views[viewName] = {viewTxt, viewPath};
          console.log('[' + ' load '.green + '] ' + 'template ' + viewPath.yellow);
          return viewTxt;
        });
      });
  }).then(viewTxts => views);
}

function compileAllViews(app) {
  buildViews(app);
  _buildViews(app, app.templates);
  compileAllComponentViews(app);
  _compileAllViews(app.templates);

  return Promise.resolve();
}

function compileAllComponentViews(app) {
  Object.keys(app.components || {}).forEach(componentName => {
    let component = app.components[componentName];
    _compileAllViews(component.views);

    // Do the same for sub-components if they exist.
    Object.keys(component.components || {}).forEach(componentName => {
      compileAllComponentViews(component.components[componentName]);
    });
  });

  return app;
}

function _compileAllViews(views = {}) {
  Object.keys(views).forEach(viewName => {
    let view = views[viewName];
    view.viewCompiled = bolt.compileEjs(view.viewTxt, {
      "filename": view.viewPath
    });
    console.log('[' + ' compile '.green + '] ' + 'template ' + view.viewPath.yellow);
  });

  return views;
}

function buildViews(app) {
  Object.keys(app.components || {}).forEach(componentName => {
    let component = app.components[componentName];
    _buildViews(app, component.views);

    // Do the same for sub-components if they exist.
    Object.keys(component.components || {}).forEach(componentName => {
      buildViews(component.components[componentName]);
    });
  });

  return app;
}

function _buildViews(app, views = {}) {
  Object.keys(views).forEach(viewName => {
    views[viewName] = bolt.insertComponentViews(app, views[viewName]);
  });

  return views;
}

function load(roots, templates, templateName) {
  return bolt.directoriesInDirectory(roots, ['templates']).then(templatesPath => {
    return bolt.directoriesInDirectory(templatesPath).filter(templatePath =>  {
      return (path.basename(templatePath) === templateName);
    });
  }).then(templatePaths => bolt.flatten(templatePaths)).then(templatePaths => {
    return Promise.all(templatePaths.map(templatePath => {
      return Promise.all([
        bolt.filesInDirectory(templatePath, 'ejs').map(viewPath => {
          let viewName = path.basename(viewPath, '.ejs');
          return readFile(viewPath, 'utf8').then(viewTxt => {
            templates[viewName] = {viewTxt, viewPath};
            console.log('[' + ' load '.green + '] ' + 'template ' + viewPath.yellow);
            return viewTxt;
          });
        }),
        loadViewContent(templatePath, templates)
      ]);
    }));
  });
}

module.exports = {
  load, loadViewContent, compileAllViews
};