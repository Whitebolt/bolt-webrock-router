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

/**
 * @todo Does this need to execute in order using a special version of mapSeries?
 */
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

function loadComponentViews(component, dirPath) {
  const app = bolt.getApp(component);
  const componentOptions = getComponentOptions(component, dirPath, parseLoadOptions(app));
  return _loadComponentViews(component, dirPath, componentOptions).then(()=>app);
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
  }));
}

function loadViewText(filename, options) {
  let views = options.views;
  return readFile(filename, 'utf-8').then(viewTxt => {
    let viewName = path.basename(filename, '.ejs');
    views[viewName] = views[viewName] || {};
    views[viewName].text = viewTxt;
    views[viewName].path = filename;
    views[viewName].compiled = compileTemplate({text: views[viewName].text, filename, options});
    return viewTxt;
  });
}

function compileTemplate(config) {
  let optionsTree = [{}];
  if (config.app) {
    optionsTree.push(parseLoadOptions(config.app, config.options || {}));
  } else if (config.options) {
    optionsTree.push(config.options);
  }
  if (config.filename) optionsTree.push({filename: config.filename});
  return ejs.compile(config.text, Object.assign.apply(Object, optionsTree));
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

function _getComponentOverridePaths(component) {
  let rootApp = bolt.getApp(component);
  let overridePaths = [];
  if (rootApp.config) {
    (rootApp.config.template || []).forEach(templateName => {
      (rootApp.config.root || []).forEach(
        root=>overridePaths.push(`${root}templates/${templateName}${component.filePath}`)
      );
    });
  }

  return overridePaths;
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

  return loadAllTemplates(options);
}

function loadComponentViewsTemplateOverrides(component) {
  return Promise.all(
    _getComponentOverridePaths(component).map(dirPath=>bolt.loadComponentViews(component, dirPath))
  );
}

function loadTemplates(app, options = {}) {
  return bolt.fire(()=>_loadTemplates(app, options), 'loadTemplates', app).then(() => app);
}

module.exports = {
  loadTemplates, loadComponentViews, loadComponentViewsTemplateOverrides, compileTemplate
};