'use strict';

const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const ejs = require('ejs');

const rxRelativeDir = /^\.\//;
const rxStartEndSlash = /^\/|\/$/g;


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
    let view = _getView(viewName, this.__componentName, req);
    if (view) {
      bolt.fire("firingView", view.path, bolt.getPathFromRequest(req));
      return view.compiled(doc, req, parent);
    } else {
      Promise.resolve('Could not find view: ' + viewName);
    }
  }
};


function loadAllTemplates(options, templateName=options.templateName) {
  if (Array.isArray(templateName)) {
    return Promise.all(templateName.map(templateName => loadAllTemplates(options, templateName)));
  }

  return Promise.all(getTemplateDirectories(options.roots, templateName).map(templateDir => {
    return bolt.filesInDirectory(templateDir, 'ejs').map(viewPath => {
      let viewText = loadViewText(viewPath, options);
      bolt.fire('loadedTemplate', viewPath);
      return viewText;
    });
  }));
}

function loadAllComponentViews(app, options = {}) {
  options = parseLoadOptions(app, options);
  return Promise.all(getComponentDirectories(options.roots).map(componentDir => {
    const component =  getComponentObj(app, componentDir);
    const componentOptions = getComponentOptions(component, componentDir, options);
    return _loadComponentViews(component, componentDir, componentOptions);
  })).then(() => app);
}

function loadAllTemplateOverrides(app, options, templateName=options.templateName) {
  if (Array.isArray(templateName)) {
    return Promise.all(templateName.map(templateName => loadAllTemplateOverrides(app, options, templateName)));
  }

  return Promise.all(getTemplateDirectories(options.roots, templateName).map(templateDir => {
    let _options = Object.assign({}, options);
    _options.roots = [templateDir];
    return loadAllComponentViews(app, _options);
  })).then(() => app);
}

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

function getConfig(app) {
  return (app.config ? app.config : (app.parent ? getConfig(app.parent) : undefined));
}

function createLocalsObject(locals = {}) {
  Object.keys(templateFunctions).forEach(funcName => {
    locals[funcName] = templateFunctions[funcName].bind(locals);
  });
  return locals;
}

function getComponentDirectories(roots) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['components']).map(componentDir =>
    bolt.directoriesInDirectory(componentDir)
  )).then(componentDirs => bolt.flatten(componentDirs));
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
  options.locals.__componentName = component.path;

  return options;
}

function getTemplateDirectories(roots, templateName) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['templates']).map(templateDir =>
    bolt.directoriesInDirectory(templateDir, bolt.makeArray(templateName))
  )).then(templateDirs => bolt.flatten(templateDirs))
}

function getViewFilenames(roots) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['views']).map(viewDir => {
    return bolt.filesInDirectory(viewDir, 'ejs');
  })).then(viewPaths => bolt.flatten(viewPaths));
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

function getTemplate(app, control) {
  return app.templates[control.template];
}

function getView(app, control, tag = {}) {
  const componentName = control.componentPath || control.component || tag.component;
  const component = getComponent(componentName, app);
  const viewName = control.view || tag.view;
  if (component && component.views[viewName]) {
    return component.views[viewName];
  }
}

function getComponent(componentName, app) {
  if (componentName.indexOf('/') === -1) {
    return app.components[componentName];
  } else {
    let component = app;
    let components = componentName.split('/');
    while (components.length && component && component.components) {
      let componentName = components.shift();
      if (componentName !== '') {
        component = component.components[componentName];
      }
    }
    return ((components.length === 0)?component:undefined);
  }
}

function applyTemplate(control, req) {
  let view = false;
  const app = req.app;
  const doc = control.doc || req.doc;
  const parent = control.parent || {};
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
    return Promise.resolve(template.compiled(doc, req, parent));
  }

  return Promise.resolve('');
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

function _getView(viewName, componentName, req) {
  let parts = viewName.split('/');
  let _viewName = parts.pop();
  let _componentName = (parts.join('/') + '/')
    .replace(rxRelativeDir, componentName)
    .replace(rxStartEndSlash, '')
    .replace('/', '.components.');
  return bolt.get(req, `app.components.${_componentName}.views.${_viewName}`);
}

function _loadTemplates(app, options) {
  options = parseLoadOptions(app, options);
  if (!options.templateName || !options.roots) return app;
  app.applyTemplate = applyTemplate;

  return loadAllTemplates(options)
    .then(() => loadAllComponentViews(app, options))
    .then(() => loadAllTemplateOverrides(app, options))
}

function loadTemplates(app, options = {}) {
  return bolt.fire(()=>_loadTemplates(app, options), 'loadTemplates', app).then(() => app);
}

module.exports = {
  loadTemplates
};