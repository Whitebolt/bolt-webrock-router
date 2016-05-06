'use strict';

const express = require('express');
const app = express();
const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
app.config = require('./server.json');



loadDatabases(app).then(() => {
  middlewareLoader(app);
  controllerLoader(app);

  app.listen(app.config.port, () => {
    console.log('Express Listening on port ' + app.config.port);
  });
});

/*mongoConnect(app.config.mongoDbUrl).then(database => {
  console.log("MongoDB Connected to server: " + app.config.mongoDbUrl);
  app.db = database;

  return database;
}).then(database => {
  
});*/

//MongoClient.connect(app.config.mongoDbUrl, function(err, database) {
  //assert.equal(null, err);
 
//});
  
/*app.get('/', (req, res) => {
  res.send('Hello World on port ' + app.config.port);
});*/

function loadDatabases(app) {
  const mongoConnect = Promise.promisify(MongoClient.connect);
  app.dbs = app.dbs || {};

  let dbPromises = [];

  Object.keys(app.config.databases).forEach(dbName => {
    let conn = app.config.databases[dbName];

    dbPromises.push(mongoConnect(conn).then(database => {
      app.dbs[dbName] = database;
      return database;
    }));
  });

  return Promise.all(dbPromises);
}

function controllerLoader(app) {
  app.controllers = app.controllers || {},
  app.config.controllers.load.forEach(controller => {
    app.controllers[controller] = require('./controllers/' + controller);
  });

  app.all(/^\/api\/.*/, (req, res, next) => {
    req.app = app;
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
    req.app = app;
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