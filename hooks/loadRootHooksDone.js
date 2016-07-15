'use strict';

module.exports = [
  (hook, app)=>bolt.loaders.database.load(app)
];