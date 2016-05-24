'use strict';

function isString(value) {
  return (
    (typeof value === 'string') ||
    (
      (!!value && typeof value === 'object') &&
      (Object.prototype.toString.call(value) === '[object String]')
    )
  );
}

function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

function isBool(value) {
  return (typeof(value) === "boolean");
}

module.exports = {
  isString, isBool, isNumeric
};