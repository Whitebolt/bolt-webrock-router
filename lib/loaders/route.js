'use strict';

function load(app) {
  app.all(/\/.*/, (req, res, next) => {

     let ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
    
    console.log(Date().toLocaleString() + ' ' + req.method + ' ' + ip + ' ' + req.path);

    req.app = app;
    let path = req.path.replace(/^\//, '').replace(/\/$/, '').split('/');
    let controller = 'index';
    let method = 'index';

    if (path.length) {
      if (app.controllers[path[0]]) {
        let _method = ((path.length === 1) ?
            app.controllers[path[0]].index :
            path[1]
        );

        if (app.controllers[path[0]][_method]) {
          controller = path[0];
          method = _method;
        }
      }
    }
    
    if (controller && method) {
      if (app.controllers[controller][method]) {
        app.controllers[controller][method](req, res, next);
      } else {
        next();
      }
    } else {
      next();
    }
  });
}

module.exports = {
  load
};