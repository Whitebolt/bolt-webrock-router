'use strict';

const session = require('express-session');

module.exports = function(app) {
  app.use(session({
    secret: app.config.secret
  }));
};