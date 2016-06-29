'use strict';

function printReportMessage(action, description, property, _colour='yellow') {
  let message = '[' + colour.green(' ' +action + ' ') + '] ' + description + ' ' + colour[_colour](property);
  console.log(message.trim());
}

function initReporting() {
  bolt.on('initialiseApp', () => printReportMessage('init', 'server', Date().toLocaleString(), 'green'));
  bolt.on('mongoConnected', (options, dbName) => printReportMessage('connect', 'MongoDb database', dbName, 'cyan'));
  bolt.on('SQLConnected', (options, dbName) => printReportMessage('connect', 'SQL database', dbName, 'cyan'));
  bolt.on('loadedController', (options, path) => printReportMessage('load', 'controller', path));
  bolt.on('loadedComponentView', (options, path) => printReportMessage('load', 'component view', path));
  bolt.on('loadedTemplate', (options, path) => printReportMessage('load', 'template', path));
  bolt.on('loadedMiddleware', (options, path) => printReportMessage('load', 'middleware', path));
  bolt.on('ranMiddleware', (options, id) => printReportMessage('run', 'middleware', id, 'cyan'));
  bolt.on('appListening', (options, port) => printReportMessage('listen', 'Bolt Server on', port, 'green'));
  bolt.on('runAppDone', () => printReportMessage('loaded', 'Bolt Server', Date().toLocaleString(), 'green'));
}

function _load(configPath) {


  bolt.fire('initServer')

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
  initReporting();

  return bolt.fire('initialiseApp', configPath)
    .then(() => _load(configPath))
    .then(app => bolt.fire('initialiseAppDone', app).then(() => app))
}

module.exports = {
  load
};
