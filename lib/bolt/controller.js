'use strict';

function getControllerMethod(componentPath) {
  let [controller, method] = componentPath.split('/');
  method = method || 'index';

  return {controller, method};
}

function runControllers(req, res, next) {
  req.template.controllers.forEach(controlerPath => {
    let [controller, method] = componentPath.split('/');
    method = method || 'index';
  });
}

module.exports = {
  runControllers
};
