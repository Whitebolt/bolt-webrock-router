'use strict';

const serve = require('serve-static');

module.exports = function(app) {
  app.use(serve(
    app.config.root, 
    {}
  ));
};