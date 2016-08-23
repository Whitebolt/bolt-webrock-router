'use strict';

/**
 * Add new objects to and object if not already present.  Will construct a
 * series of blank objects attached to the property names supplied. If
 * properties already exist, leave as.
 *
 * @public
 * @param {Object} obj                Object to work on.
 * @param {Array|string} properties   Properties to set.
 * @returns {Object}                  The original object returned
 *                                    for chaining.
 */
function addDefaultObjects(obj, properties) {
  (
    bolt.isString(properties) ?
      bolt.splitAndTrim(properties, ',') :
      properties
  ).forEach(prop=>{obj[prop] = obj[prop] || {};});
  return obj;
}

module.exports = {
  addDefaultObjects
};