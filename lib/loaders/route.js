'use strict';

const rxPathFixSlashes = /^\/|\/$/g;

function getIp(request) {
  return request.headers['x-forwarded-for'] ||
    request.connection.remoteAddress ||
    request.socket.remoteAddress ||
    request.connection.socket.remoteAddress;
}

function getPathPartsArray(path) {
  return path.replace(rxPathFixSlashes, '').split('/');
}

function getComponentControllerMetod(request) {
  let app = request.app;
  let path = getPathPartsArray(request.path);
  let component = 'index';
  let controller = 'index';
  let method = 'index';

  if (path.length) {
    if (app.components[path[0]]) {
      if ((path.length > 1) && app.components[path[0]].controllers[path[1]]) {
        let _method = ((path.length === 2) ? 'index' : path[2]);
        if (app.components[path[0]].controllers[path[1]][_method]) {
          component = path[0];
          controller = path[1];
          method = _method;
        }
      } else {
        component = app.components[path[0]];
      }
    }
  }

  return [component, controller, method];
}

function getMethod(request) {
  let app = request.app;
  let [componentName, controllerName, methodName] = getComponentControllerMetod(request);
  if (
    app &&
    app.components &&
    app.components[componentName] &&
    app.components[componentName].controllers &&
    app.components[componentName].controllers[controllerName] &&
    app.components[componentName].controllers[controllerName][methodName]
  ) {
    return app.components[componentName].controllers[controllerName][methodName];
  }
}

function load(app) {
  app.all('/*', (req, res, next) => {
    let ip = getIp(req);
    let method = getMethod(req);
    
    console.log(Date().toLocaleString() + ' ' + req.method + ' ' + ip + ' ' + req.path);

    return (method? method(req, res, next) : next());
  });

  return app;
}

module.exports = {
  load
};