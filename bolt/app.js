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
 * @returns {Function}      Unreg function.
 */
function _registerLogEvent(config) {
  let description = ejs.compile(config.description, ejsOptions);
  let property = config.property?ejs.compile(config.property, ejsOptions):undefined;

  return bolt.on(config.event, (options, ...params) => {
    let level = config.level || 3; // Placed here so level can be changed in-flight.
    let channel = _getEventChannel('logging', level, 8);
    let promises = [
      description(params),
      config.property ? property(params) : Promise.resolve(params[0])
    ];

    Promise.all(promises).spread((description, property) => {
      let message = '[' + colour[config.actionColour || 'green'](' ' + (config.action || config.event) + ' ') + '] ' + description + ' ' + colour[config.propertyColour || 'yellow'](property);
      bolt.broadcast(channel, message);
    });
  });
}

/**
 * Setup logging both to the console and to the access logs.
 *
 * @private
 * @param {Object} app    The express application.
 */
function _initLogging(app) {
  app.config.eventConsoleLogging.forEach(config => _registerLogEvent(config));
  _initConsoleLogging(app.config.logLevel, (options, message) => console.log(message));
  _initAccessLogging(app.config.accessLog);

  return app;
}

/**
 * Initalise console logging for given log level.
 *
 * @private
 * @param {integer} level       Log level to subscribe to.
 * @param {function} callback   Callback to fire on event.
 */
function _initConsoleLogging(level, callback) {
  let channel = _getEventChannel('logging', level, 8);
  bolt.subscribe(channel, callback);
}

/**
 * Initilaise access logging to the given file path.
 *
 * @todo  Handle errors.
 * @todo  Return a close function or handle object.
 *
 * @private
 * @param {string} logPath    Path to log to.
 */
function _initAccessLogging(logPath) {
  if (logPath) {
    open(logPath, 'a').then(fd => {
      bolt.subscribe('/logging/access', (options, message)=>fs.write(fd, message));
    });
  }
}

/**
 * Get a logging channel based on a level.  So with a root of 'logging' and
 * level of 6 (max 8), the channel would be /logging/8/7/6.  With the same
 * root and max but a level of 3, the channel would be /logging/8/7/6/5/4/3
 *
 * @private
 * @param {string} root     The root channel name.
 * @param {integer} level   The level to use.
 * @param {integer} max     The max level possible.
 * @returns {string}        The channel name.
 */
function _getEventChannel(root, level, max) {
  let channel = '/' + root;
  for (let n=max; n>=level; n--) channel += '/' + n.toString();
  return channel;
}

/**
 * Get a config object from package.json and the supplied config.
 *
 * @private
 * @param {Object} config   Config object to act as the last merge item.
 * @returns {Object}        The new constructed config with default available.
 */
function _getConfig(config) {
  return Object.assign({
    version: packageData.version,
    name: packageData.name,
    description: packageData.description,
    template: 'index'
  }, packageData.config || {}, config);
}

/**
 * Create a new express application with the given config object.
 *
 * @private
 * @param {Object} config   A config object.
 * @returns {Object}        The express application instance.
 */
function _createApp(config) {
  const app = express();
  app.config = _getConfig(config);
  bolt.addDefaultObjects(app, ['middleware', 'templates']);
  return app;
}

function _boltLoader(app) {
  return bolt.directoriesInDirectory(app.config.root, ['bolt'])
    .filter(dirPath => (dirPath != boltRootDir + '/bolt'))
    .map(dirPath=>bolt.require.importDirectory(dirPath, {
      merge: true,
      imports: bolt,
      callback:(filePath)=>bolt.fire('extraBoltModuleLoaded', filePath)
    }))
    .then(()=>app);
}

/**
 * Load a new bolt application using the supplied config path.
 *
 * @private
 * @param {string} configPath   Path to server config.
 * @returns {Promise}           Promise resolving to app object once it
 *                              is loaded.
 */
function _loadApplication(configPath) {
  return bolt.require(configPath)
    .then(_createApp)
    .then(_initLogging)
    .then(app=>{
      bolt.fire('configLoaded', configPath);
      return app;
    })
    .then(_boltLoader);
}

/**
 * Import a given set of paths into the app.
 *
 * @public
 * @param {Object} options                Options object for this import.
 * @param {Array|string} options.roots    Root folder(s) to start imports from.
 * @param {string} options.dirName        Directory name within each root to
 *                                        import from.
 * @param {Object} options.importObject   The object to import into.
 * @param {string} options.eventName      The event to fire once import is complete.
 * @returns {Promise}
 */
function importIntoObject(options) {
  return Promise.all(bolt.directoriesInDirectory(options.roots, [options.dirName])
    .map(dirPath => bolt.require.importDirectory(dirPath, {
      imports: options.importObj,
      callback: filepath => bolt.fire(options.eventName, filepath)
    }))
  );
}

/**
 * Get the root parent of the given component object. Scale through the
 * hierarchy till the first object is reached.
 *
 * @param {Object} component    Application or component object.
 * @returns {Object}            Express application instance.
 */
function getApp(component) {
  let app = component;
  while (app.parent) app = app.parent;
  return app;
}

/**
 * Load a new bolt application using the given config path, firing the correct
 * initialisation events.
 *
 * @public
 * @param {string} configPath   Path to server config.
 * @returns {Promise}           Promise resolving to app object once it is
 *                              loaded and events fired.
 */
function loadApplication(configPath) {
  return bolt.fire(()=>_loadApplication(configPath), 'initialiseApp', configPath);
}

module.exports = {
  loadApplication, getApp, importIntoObject
};
