'use strict';

const rxPathFixSlashes = /^\/|\/$/g;

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
          bolt.fire("firingControllerMethod", method.methodPath, bolt.getPathFromRequest(req));
          return method.method(component).then(component => {
            component.component = component.component || method.componentName;
            return component;
          });
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
  let method = config.methods.shift();
  method(config.component).then(() => {
    if (config.component.redirect) {
      config.res.redirect(config.component.status || 302, config.component.redirect);
      return config.res.end();
    } else if (config.component.done) {
      return applyAndSend(config)
    } else if (config.methods.length && !config.component.done) {
      return callMethod(config);
    } else {
      return config.component;
    }
  }, error => handleMethodErrors(error, config));
}

function _load(app) {
  app.all('/*', (req, res, next) => {
    let ip = getIp(req);

    console.log(Date().toLocaleString() + ' ' + req.method + ' ' + ip + ' ' + req.path);

    let methods = getMethods(app, req);
    let component = {req, done: false};
    if (methods.length) {
      callMethod({methods, component, req, res, next});
    } else {
      next();
    }
  });

  return Promise.resolve(app);
}

function load(app) {
  return bolt.fire('loadRoutes', app)
    .then(() => _load(app))
    .then(() => bolt.fire('loadRoutesDone', app))
    .then(() => app);
}

module.exports = {
  load
};