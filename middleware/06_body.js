'use strict';

const bodyParser = require('body-parser');

module.exports = function(app) {
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.text());
  app.use(bodyParser.raw());
};