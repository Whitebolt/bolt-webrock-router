'use strict';

function shallowFlatten(ary) {
  return [].concat(...ary)
}

function flatten(ary) {
  return shallowFlatten(ary.map(item => Array.isArray(item) ? flatten(item) : item))
}

module.exports = {
  flatten
};