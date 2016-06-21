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
    let method = app.components[componentName].controllers[controllerName][methodName];
    return (req) => {
      return method(req).then(control => {
        control.component = control.component || componentName;
        return control;
      })
    }
  }
}

function applyAndSend(control, res, req) {
  return req.app.applyTemplate(control, req).then(data => {
    res.send(data);
    res.end();
  });
}

function handleMethodErrors(error, req, res, next) {
  console.error(error);
  next();
}

function load(app) {
  app.all('/*', (req, res, next) => {
    let ip = getIp(req);
    let method = getMethod(req);
    
    console.log(Date().toLocaleString() + ' ' + req.method + ' ' + ip + ' ' + req.path);

    if (method) {
      method(req).then(
        control => applyAndSend(control, res, req),
        error => handleMethodErrors(error, req, res, next)
      );
    } else {
      next();
    }
  });

  return app;
}

module.exports = {
  load
};