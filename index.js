'use strict';

const fs = require('fs');
const express = require('express');
const app = express();
const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const mysql = require('mysql');
const ObjectId = require('mongodb').ObjectID;
const ejs = require('ejs');
app.config = require('./server.json');



databaseLoader(app).then(() => {
  middlewareLoader(app);
  controllerLoader(app);
  templateLoader(app);

  app.listen(app.config.port, () => {
    console.log('Express Listening on port ' + app.config.port);
  });
});

function loadTextFile(filename) {
  return fs.readFileSync(filename, 'utf8');
}

function templateLoader(app) {
  app.templates = app.templats || {};

  Object.keys(app.config.templates).forEach(templateName => {
    let filename = app.config.templates[templateName] + '.ejs';
    let template = loadTextFile('./templates/' + filename);
    app.templates[templateName] = ejs.compile(template, {});
  });
}

function databaseLoader(app) {
  const mongoConnect = Promise.promisify(MongoClient.connect);
  app.dbs = app.dbs || {};

  let dbPromises = [];

  Object.keys(app.config.databases).forEach(dbName => {
    let options = app.config.databases[dbName];

    if (options.type === 'mongodb') {
      dbPromises.push(mongoConnect(createMongoUrl(options)).then(database => {
        app.dbs[dbName] = database;
        return database;
      }));
    } else if (options.type === 'mysql') {
      dbPromises.push(new Promise(function(resolve, reject) {
        let database = mysql.createConnection({
          host     : options.server,
          user     : options.username,
          password : options.password,
          database : options.database
        });

        database.connect();
        app.dbs[dbName] = database;
        resolve(database);
      }));
      
    }
  });

  return Promise.all(dbPromises);
}

function createMongoUrl(options) {
  return 'mongodb://' + options.server + ':' + options.port + '/' + options.database;
}

function controllerLoader(app) {
  app.controllers = app.controllers || {},
  app.config.controllers.load.forEach(controller => {
    app.controllers[controller] = require('./controllers/' + controller);
  });

  app.all(/\/.*/, (req, res, next) => {
    req.app = app;
    let path = req.path.replace(/^\//, '').replace(/\/$/, '').split('/');
    let controller = app.config.controllers.default.controller;
    let method = app.config.controllers.default.method;

    if (path.length) {
      if (app.controllers[path[0]]) {
        let _method = ((path.length === 1) ?
          app.controllers[path[0]].default : 
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

function middlewareLoader(app) {
  app.config.middleware.forEach(middleware => {
    require('./middleware/' + middleware)(app);
  });
} 