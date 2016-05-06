'use strict';

const express = require('express');
const app = express();
app.config = require('./server.json');

middlewareLoader(app);
controllerLoader(app);

/*app.get('/', (req, res) => {
  res.send('Hello World on port ' + app.config.port);
});*/

app.listen(app.config.port, () => {
  console.log('Express Listening on port ' + app.config.port);
});

function controllerLoader(app) {
  app.controllers = app.controllers || {},
  app.config.controllers.load.forEach(controller => {
    app.controllers[controller] = require('./controllers/' + controller);
  });

  app.all(/^\/api\/.*/, (req, res, next) => {
    let path = req.path.replace(/^\/api\//, '').split('/');
    if (path.length) {
      let controller = path[0];
      if (!app.controllers[controller]) {
        next();
      }

      let method = ((path.length === 1) ?
        app.controllers[controller].default : 
        path[1]
      );
      
      if (app.controllers[controller][method]) {
        app.controllers[controller][method](req, res, next);
      } else {
        next();
      }
    }
  });

  app.all(/\/.*/, (req, res, next) => {
    let controller = app.config.controllers.default.controller;
    let method = app.config.controllers.default.method;

    app.controllers[controller][method](req, res, next);
  });
}

function middlewareLoader(app) {
  app.config.middleware.forEach(middleware => {
    require('./middleware/' + middleware)(app);
  });
} 