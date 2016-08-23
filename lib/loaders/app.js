'use strict';

const Promise = require('bluebird');
const fs = require('fs');
const open = Promise.promisify(fs.open);
const ejs = require('ejs');
const packageData = require(boltRootDir + '/package.json');

const ejsOptions = {
  strict: true,
  localsName: ['params'],
  awaitPromises: true,
  _with: false
};

/**
 * Take a config object and register log events according to the the criteria
 * within in.  This is basically way of mapping specfic events to specific log
 * broadcasts.  Normally the input object is taken from package.json.
 *
 * @public
 * @param {Object} config   The config object.
 */
function registerLogEvent(config) {
  let description = ejs.compile(config.description, ejsOptions);
  let property = config.property?ejs.compile(config.property, ejsOptions):undefined;

  bolt.on(config.event, (options, ...params) => {
    let level = config.level || 3;

    Promise.all([
      description(params),
      config.property ? property(params) : Promise.resolve(params[0])
    ]).spread((description, property) => {
      let channel = '/logging';
      let message = '[' + colour[config.actionColour || 'green'](' ' + (config.action || config.event) + ' ') + '] ' + description + ' ' + colour[config.propertyColour || 'yellow'](property);
      for (let n=8; n>=level; n--) channel += '/' + n.toString();
      bolt.broadcast(channel, message);
    });
  });
}

function initReporting(app) {
  let channel = '/logging';
  for (let n=8; n>=app.config.logLevel; n--) channel += '/' + n.toString();
  bolt.subscribe(channel, (options, message) => console.log(message));
  app.config.eventConsoleLogging.forEach(config => registerLogEvent(config));
  if (app.config.accessLog) {
    open(app.config.accessLog, 'a').then(fd => {
      bolt.subscribe('access-log', (options, message)=>{
        fs.write(fd, message);
      });
    });
  }
}

function getConfig(config) {
  return Object.assign({
    version: packageData.version,
    name: packageData.name,
    description: packageData.description,
    template: 'index'
  }, packageData.config || {}, config);
}

function createApp(config) {
  const app = express();
  app.config = getConfig(config);
  return app;
}

/**
 * @todo  Extract this to bolt object.
 */
function addObjects(obj, objsNames) {
  objsNames.forEach(prop=>{obj[prop] = obj[prop] || {};});
  return obj;
}

function _load(configPath) {
  return bolt.require(process.argv[2])
    .then(config => createApp(config))
    .then(app=>{
      initReporting(app);
      bolt.fire('configLoaded', configPath);
      return addObjects(app, ['middleware', 'templates']);
    });
}

function load(configPath) {
  return bolt.fire(()=>_load(configPath), 'initialiseApp', configPath);
}

module.exports = {
  load
};
