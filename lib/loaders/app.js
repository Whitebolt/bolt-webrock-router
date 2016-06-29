'use strict';

const Promise = require('bluebird');

function printReportMessage(action, description, property, _colour='yellow') {
  let message = '[' + colour.green(' ' +action + ' ') + '] ' + description + ' ' + colour[_colour](property);
  console.log(message.trim());
}

function initReporting() {
  bolt.subscribe('logging-level-3', (options, message) => console.log(message));

  bolt.registerLogEvent({event: 'initialiseApp', action: 'init', property: `${Date().toLocaleString()}`, description: 'server', propertyColour: 'green'});
  bolt.registerLogEvent({event: 'mongoConnected', action: 'connect', description: 'MongoDb database', propertyColour: 'cyan'});
  bolt.registerLogEvent({event: 'SQLConnected', action: 'connect', description: 'SQL database', propertyColour: 'cyan'});
  bolt.registerLogEvent({event: 'loadedController', action: 'load', description: 'controller'});
  bolt.registerLogEvent({event: 'loadedComponentView', action: 'load', description: 'component view'});
  bolt.registerLogEvent({event: 'loadedTemplate', action: 'load', description: 'template'});
  bolt.registerLogEvent({event: 'loadedMiddleware', action: 'load', description: 'middleware'});
  bolt.registerLogEvent({event: 'ranMiddleware', action: 'run', description: 'middleware', propertyColour: 'cyan'});
  bolt.registerLogEvent({event: 'appListening', action: 'listen', description: 'Bolt Server on', propertyColour: 'green'});
  bolt.registerLogEvent({event: 'runAppDone', action: 'loaded', description: 'Bolt Server', property: `${Date().toLocaleString()}`, propertyColour: 'green'});
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
      console.log(defaultConfig);

      app.config = Object.assign(defaultConfig, config);
      app.config.template = app.config.template || 'index';
      app.middleware = app.middleware || {};
      app.templates = app.templates || {};

      return app;
    });
  });
}

function load(configPath) {
  initReporting();

  return bolt.fire('initialiseApp', configPath)
    .then(() => _load(configPath))
    .then(app => bolt.fire('initialiseAppDone', app).then(() => app))
}

module.exports = {
  load
};
