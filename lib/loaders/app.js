'use strict';

const Promise = require('bluebird');

function initReporting(app) {
  bolt.subscribe('logging-level-' + app.config.logLevel.toString(), (options, message) => console.log(message));
  app.config.eventConsoleLogging.forEach(config => bolt.registerLogEvent(config));
}

function getDefaultConfig() {
  try {
    return bolt.require(boltRootDir + '/package.json').then(packageData=>packageData.config||{}, ()=>{});
  } catch(evt) {
    return Promise.resolve({});
  }
}

function _load(configPath) {
  bolt.fire('initServer');
  return bolt.require(process.argv[2]).then(config => {
    const app = express();
    return getDefaultConfig().then(defaultConfig => {
      app.config = Object.assign(defaultConfig, config);
      initReporting(app);
      bolt.fire('configLoaded', configPath);
      app.config.template = app.config.template || 'index';
      app.middleware = app.middleware || {};
      app.templates = app.templates || {};
      return app;
    });
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
