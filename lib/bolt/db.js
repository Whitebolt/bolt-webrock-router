'use strict';

const mongo = require('mongodb');

/**
 * Get a mongo id for the given id value.
 *
 * @public
 * @param {*} id        Value, which can be converted to a mongo-id.
 * @returns {Object}    Mongo-id object.
 */
function mongoId(id) {
  return new mongo.ObjectID(id);
}

module.exports = {
  mongoId
};