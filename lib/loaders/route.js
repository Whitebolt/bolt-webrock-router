'use strict';

function load(app) {
  app.all('/*', (req, res, next) => {

     let ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
    
    console.log(Date().toLocaleString() + ' ' + req.method + ' ' + ip + ' ' + req.path);

    let path = req.path.replace(/^\//, '').replace(/\/$/, '').split('/');
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
    
    if (app.components[component].controllers[controller][method]) {
      app.components[component].controllers[controller][method](req, res, next);
    } else {
      next();
    }
  });

  return app;
}

module.exports = {
  load
};