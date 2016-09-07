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

function contentIsType(type, matchType) {
  let matchTypes = bolt.makeArray(matchType);
  return ((type.filter(_type=>(bolt.indexOf(matchTypes, _type) !== -1))).length > 0);
}

function getEncodingOfType(type, defaultEncoding='utf-8') {
  if (type.length <= 1) return defaultEncoding;
  let encodings = type
    .filter(type=>(type.indexOf('charset=') !== -1))
    .map(encoding=>encoding.split('=').pop());

  return (encodings.length ? encodings.shift() : defaultEncoding);
}

function boltRouter(app) {
  return (req, res, next)=>{
    let methods = getMethods(app, req);
    let component = {req, res, done: false};
    if (methods.length) {
      callMethod({methods, component, req, res, next})
        .then(component=>{
          if (component && component.res && !component.res.headersSent) next();
        });
    } else {
      next();
    }
  };
}

function getTypesArray(res) {
  return (res.get('Content-Type') || '').split(';').map(type=>type.trim());
}

function proxyRouter(app, proxyConfig) {
  let config = {reqAsBuffer: true};
  if (proxyConfig.proxyParseForEjs) {
    config.intercept = (rsp, data, req, res, callback)=>{
      let type = getTypesArray(res);
      if (contentIsType(type, proxyConfig.proxyParseForEjs)) {
        let _data = data.toString(getEncodingOfType(type));
        let template = bolt.compileTemplate({text:_data, filename:req.path, app});
        Promise.resolve(template({}, req, {})).then(data=>callback(null, data));
      } else {
        callback(null, data);
      }
    };
  }
  if (proxyConfig.slugger) {
    config.forwardPathAsync = bolt[proxyConfig.slugger];
  }

  return proxy(proxyConfig.forwardPath, config);
}

function _loadRoutes(app) {
  let routing = ['/*', boltRouter(app)];
  if (app.config.proxy && app.config.proxy.forwardPath) {
    bolt.makeArray(app.config.proxy).forEach(proxyConfig=>{
      if (proxyConfig.forwardPath) routing.push(proxyRouter(app, proxyConfig));
    });
  }
  app.all.apply(app, routing);

  return Promise.resolve(app);
}

function loadRoutes(app) {
  return bolt.fire(()=>_loadRoutes(app), 'loadRoutes', app).then(() => app);
}

module.exports = {
  loadRoutes
};