'use strict';

const mongo = require('mongodb');

function mongoId(id) {
  return new mongo.ObjectID(id);
}

module.exports = {
  mongoId
};