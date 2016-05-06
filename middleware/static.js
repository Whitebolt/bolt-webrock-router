'use strict';

const serve = require('serve-static');

module.exports = function(app) {
  app.config.root.forEach(rootDir => {
    app.use(serve(rootDir, {}));
  });
};