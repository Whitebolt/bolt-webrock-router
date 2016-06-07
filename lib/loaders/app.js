'use strict';

function load(configPath) {
  return bolt.require(process.argv[2]).then(config => {
    const app = express();

    app.config = config;
    app.config.template = app.config.template || 'index';
    app.middleware = app.middleware || {};
    app.templates = app.templates || {};

    return app;
  });
}

module.exports = {
  load
};
