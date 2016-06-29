'use strict';

function _load(configPath) {
  return bolt.require(process.argv[2]).then(config => {
    const app = express();

    app.config = config;
    app.config.template = app.config.template || 'index';
    app.middleware = app.middleware || {};
    app.templates = app.templates || {};

    return app;
  });
}

function load(configPath) {
  return bolt.fire('initialiseApp', configPath)
    .then(() => _load(configPath))
    .then(app => bolt.fire('initialiseAppDone', app).then(() => app))
}

module.exports = {
  load
};
