'use strict';

const is = require('./is');

function merge(create) {
  var args = Array.prototype.slice.call(arguments);
  if (is.isBool(create)) {
    if (create === true) {
      args.unshift({});
    }
    args.shift();
  }

  return Object.assign.apply(Object, args);
}

module.exports = {
  merge
};