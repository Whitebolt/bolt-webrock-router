'use strict';

const ejs = require('ejs');
const Promise = require('bluebird');

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
      let message = '[' + colour[config.actionColour || 'green'](' ' + (config.action || config.event) + ' ') + '] ';
      message += description + ' ' + colour[config.propertyColour || 'yellow'](property);
      for (let n=0; n<8; n++) {
        if (n >= level) bolt.broadcast('logging-level-' + n.toString(), message);
      }
    });
  });
}

module.exports = {
  registerLogEvent
};