'use strict';

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

function init(app) {
  app.use(session({
    secret: app.config.secret,
    store: new MongoStore({
      db: app.dbs.main
    }),
    resave: true,
    saveUninitialized: true
  }));
};

init.priority = 1;
module.exports = init;