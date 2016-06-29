'use strict';

function registerLogEvent(config) {
  bolt.on(config.event, (options, ...params) => {
    let level = options.level || 3;
    let message = '[' + colour[config.actionColour || 'green'](' ' + (config.action || config.event) + ' ') + '] ';
    message += bolt.iterpolate(config.description, params) + ' ';
    message += colour[config.propertyColour || 'yellow'](
      config.property ?
        bolt.iterpolate(config.property, params) :
        params[0]
    );

    for (let n=0; n<=level; n++) {
      bolt.broadcast('logging-level-' + n.toString(), message);
    }
  });
}

module.exports = {
  registerLogEvent
};