'use strict';

const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const ejs = require('ejs');

const rxFirstComponentsDir = /.*?\/components\//;
const rxLastViewsDir = /\/views\/.*?$/;
const rxAllComponentDirs = /\/components\//g;
const rxTestIsEjsFilename = /\.ejs$/;
const rxRelativeDir = /^\.\//;

function getTemplateDirectories(roots, templateName) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['templates']).map(templateDir =>
    bolt.directoriesInDirectory(templateDir, bolt.makeArray(templateName))
  )).then(templateDirs => bolt.flatten(templateDirs))
}

function getComponentDirectories(roots) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['components']).map(componentDir =>
    bolt.directoriesInDirectory(componentDir)
  )).then(componentDirs => bolt.flatten(componentDirs));
}

function getViewFilenames(roots) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['views']).map(viewDir => {
    return bolt.filesInDirectory(viewDir, 'ejs');
  })).then(viewPaths => bolt.flatten(viewPaths));
}

function getComponentObj(app, componentDir) {
  const componentName = path.basename(componentDir);
  app.components = app.components || {};
  app.components[componentName] = app.components[componentName] || {};
  const component =  app.components[componentName];
  component.views = component.views || {};

  return component;
}

function getComponentOptions(component, componentDir, parentOptions = {}) {
  const options = Object.assign({}, parentOptions);
  options.views = component.views;
  options.roots = [componentDir];

  return options;
}

function _loadComponentViews(component, componentDir, componentOptions) {
  return Promise.all(getViewFilenames(componentDir).map(viewPath => {
    let viewText = loadViewText(viewPath, componentOptions);
    bolt.fire('loadedComponentView', viewPath);
    return viewText;
  })).then(() => { // next level
    return loadAllComponentViews(component, componentOptions);
  });
}

function loadAllComponentViews(app, options = {}) {
  options = parseLoadOptions(app, options);

  return Promise.all(getComponentDirectories(options.roots).map(componentDir => {
    const component =  getComponentObj(app, componentDir);
    const componentOptions = getComponentOptions(component, componentDir, options);
    return _loadComponentViews(component, componentDir, componentOptions);
  })).then(() => app);
}

function componentPathToComponentName(filepath) {
  let componentName = filepath
    .replace(rxFirstComponentsDir,'')
    .replace(rxLastViewsDir, '')
    .replace(rxAllComponentDirs, '/');
  return ((rxTestIsEjsFilename.test(componentName)) ? 'index' : componentName);
}

function loadViewText(filename, options) {
  let views = options.views;
  return readFile(filename, 'utf-8').then(viewTxt => {
    let viewName = path.basename(filename, '.ejs');
    let _options = Object.assign({}, options, {filename});
    views[viewName] = views[viewName] || {};
    views[viewName].text = viewTxt;
    views[viewName].path = filename;
    views[viewName].compiled = ejs.compile(views[viewName].text, _options);
    return viewTxt;
  });
}

function loadAllTemplates(options) {
  return Promise.all(getTemplateDirectories(options.roots, options.templateName).map(templateDir => {
    return bolt.filesInDirectory(templateDir, 'ejs').map(viewPath => {
      let viewText = loadViewText(viewPath, options);
      bolt.fire('loadedTemplate', viewPath);
      return viewText;
    });
  }));
}

function loadAllTemplateOverrides(app, options) {
  return Promise.all(getTemplateDirectories(options.roots, options.templateName).map(templateDir => {
    const _options = Object.assign({}, options);
    _options.roots = [templateDir];
    return loadAllComponentViews(app, _options);
  })).then(() => app);
}

function getTemplate(app, control) {
  return app.templates[control.template];
}

function getView(app, control, tag = {}) {
  const componentName = control.component || tag.component;
  const component = app.components[componentName];
  const viewName = control.view || tag.view;
  if (component && component.views[viewName]) {
    return component.views[viewName];
  }
}

function applyTemplate(control, req) {
  let view = false;
  const app = req.app;
  const doc = control.doc || req.doc;
  let template = getTemplate(app, control);
  if (!template) {
    template = getView(app, control);
    view = true;
  }

  if (template) {
    bolt.fire(
      view?"fireingView":"firingTemplate",
      template.path, bolt.getPathFromRequest(req)
    );
    return Promise.resolve(template.compiled(doc, req));
  }

  return Promise.resolve('');
}

function getConfig(app) {
  return (app.config ? app.config : (app.parent ? getConfig(app.parent) : undefined));
}

function getPaths(route) {
  let routes = [];
  while (route.length) {
    routes.push(route);
    let routeParts = route.split('/');
    routeParts.pop();
    route = routeParts.join('/')
  }
  routes.push('/');
  return routes;
}

function getMethod(route, app) {
  let methods = [];
  getPaths(route).forEach(route => {
    if (app.controllerRoutes[route]) {
      app.controllerRoutes[route].forEach(method => methods.push(method.method));
    }
  });
  return methods.shift();
}

const templateFunctions = {
  component: function (componentName, doc, req, parent) {
    let _componentName = ('/' + componentName.replace(rxRelativeDir, this.__componentName)).replace('//', '/');
    let method = getMethod(_componentName, req.app);
    if (method) {
      req.doc = req.doc || doc;
      bolt.fire("firingControllerMethod", method.methodPath, bolt.getPathFromRequest(req));
      return method({req, doc, parent, component:this.component, view:this.view});
    } else {
      Promise.resolve('Could not find component: ' + componentName);
    }
  },

  view: function (viewName, doc, req, parent) {
    let parts = viewName.split('/');
    let _viewName = parts.pop();
    let _componentName = parts.join('/')
      .replace(rxRelativeDir, this.__componentName)
      .replace('/', '.components.');
    let view = bolt.get(req, `app.components.${_componentName}.views.${_viewName}`);
    if (view) {
      bolt.fire("firingView", view.path, bolt.getPathFromRequest(req));
      return view.compiled(doc, req, parent);
    } else {
      Promise.resolve('Could not find view: ' + viewName);
    }
  }
};

function parseLoadOptions(app, options = {}) {
  const config = getConfig(app) || {};

  return Object.assign(options, {
    templateName: options.templateName || config.template,
    views: options.views || app.templates,
    roots: options.roots || config.root,
    delimiter: options.delimiter || '%',
    strict: true,
    localsName: ['doc', 'req', 'parent'],
    _with: false,
    debug: false,
    locals: createLocalsObject(),
    awaitPromises: true
  });
}

function createLocalsObject() {
  let locals = {};
  Object.keys(templateFunctions).forEach(funcName => {
    locals[funcName] = templateFunctions[funcName].bind(locals);
  });
  return locals;
}

function _load(app, options) {
  options = parseLoadOptions(app, options);
  if (!options.templateName || !options.roots) return app;
  app.applyTemplate = applyTemplate;

  return loadAllTemplates(options)
    .then(() => loadAllComponentViews(app, options))
    .then(() => loadAllTemplateOverrides(app, options));
}

function load(app, options = {}) {
  return bolt.fire('loadTemplates', app)
    .then(() => _load(app, options))
    .then(() => bolt.fire('loadTemplatesDone', app))
    .then(() => app);
}

module.exports = {
  load
};
