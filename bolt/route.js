'use strict';

const Promise = require('bluebird');
const proxy = require('express-http-proxy');
const ejs = require('ejs');


function getIp(request) {
  return request.headers['x-forwarded-for'] ||
    request.connection.remoteAddress ||
    request.socket.remoteAddress ||
    request.connection.socket.remoteAddress;
}

function getMethods(app, req) {
  let methods = [];
  getPaths(req).forEach(route => {
    if (app.controllerRoutes[route]) {
      app.controllerRoutes[route].forEach(method => {
        methods.push((component) => {
          bolt.fire("firingControllerMethod", method.method.methodPath, bolt.getPathFromRequest(req));
          component.component = component.component || method.method.componentName;
          component.componentPath = method.method.componentPath;
          return method.method(component);
        });
      });
    }
  });
  return methods;
}

function applyAndSend(config) {
  return config.req.app.applyTemplate(config.component, config.req).then(data => {
    config.res.send(data);
    config.res.end();
  });
}

function handleMethodErrors(error, config) {
  console.error(error);
  config.next();
}

function getPaths(req) {
  let route = bolt.getPathFromRequest(req);
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

function callMethod(config) {
  let method = Promise.method(config.methods.shift());
  return method(config.component).then(() => {
    if (config.component.redirect) {
      config.res.redirect(config.component.status || 302, config.component.redirect);
      return config.res.end();
    } else if (config.component.done && !config.component.res.headersSent) {
      return applyAndSend(config)
    } else if (config.methods.length && !config.component.done && !config.component.res.headersSent) {
      return callMethod(config);
    } else {
      return config.component;
    }
  }, error => handleMethodErrors(error, config));
}

function contentIsType(res, type) {
  return (bolt.indexOf((res.get('Content-Type') || '').split(';').filter(type=>type.trim()), type) !== -1);
}

function _loadRoutes(app) {
  app.all('/*', (req, res, next) => {
    let methods = getMethods(app, req);
    let component = {req, res, done: false};
    if (methods.length) {
      callMethod({methods, component, req, res, next}).then(component=>next());
    } else {
      next();
    }
  });

  if (app.config.proxy) {
    let options = bolt.parseLoadOptions(app);

    app.all('/*', proxy(app.config.proxy, {
      reqAsBuffer: true,
      intercept: (rsp, data, req, res, callback)=>{
        if (contentIsType(res, 'text/html')) {
          let _options = Object.assign({}, options, {filename:req.path});
          let template = ejs.compile(data.toString('utf-8'), _options);
          Promise.resolve(template({}, req, {})).then(data=>callback(null, data));
        } else {
          callback(null, data);
        }
    }}));
  }

  return Promise.resolve(app);
}

function loadRoutes(app) {
  return bolt.fire(()=>_loadRoutes(app), 'loadRoutes', app).then(() => app);
}

module.exports = {
  loadRoutes
};