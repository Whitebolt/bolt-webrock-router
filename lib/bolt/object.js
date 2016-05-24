'use strict';

const is = require('./is');
const rxBracketsInPathReplacer = /\[(\w+)\]/g;

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

function get(path, value) {
  path
    .replace(rxBracketsInPathReplacer, '.$1')
    .split('.')
    .map(part => is.isNumeric(part)?parseInt(part):part)
    .every(part => {
      let has = value.hasOwnProperty(part);
      value = value[part];
      return has;
    });

  return value;
}

function set(path, obj, value, build) {
  let parent;
  let last;

  path
    .replace(rxBracketsInPathReplacer, '.$1')
    .split('.')
    .map(part => is.isNumeric(part)?parseInt(part):part)
    .every(part => {
      [parent, last] = [obj, part];
      let has = obj.hasOwnProperty(part);
      if (build && !has) {
        obj[part] = {};
      }
      obj = obj[part];
      return (has || build);
    });

  if (parent && obj) {
    parent[last] = value;
  }
}

module.exports = {
  merge, get, set
};