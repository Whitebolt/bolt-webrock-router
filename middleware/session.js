'use strict';

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

module.exports = function(app) {
  app.use(session({
    secret: app.config.secret,
    store: new MongoStore({
      db: app.dbs.main
    })
  }));
};