'use strict';


/**
 * Marge a series of objects together.  Parameters are the objects to merge.
 * Will merge into the first object unless create is set to true whereby a new
 * blank object is merged into.
 *
 * @public
 * @param {boolean} [create]    Create a new blank object to merge into?
 * @returns {Object}            The object merged into.
 */
function merge(create) {
  var args = Array.prototype.slice.call(arguments);
  if (bolt.isBoolean(create)) {
    if (create === true) args.unshift({});
    args.shift();
  }

  return Object.assign.apply(Object, args);
}

module.exports = {
  merge
};