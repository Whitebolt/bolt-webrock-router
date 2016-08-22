'use strict';

/**
 * Is the given value numeric.  Different to lodash.isNumber() as will not
 * return true for infinity and NaN.
 *
 * @public
 * @param {*} value     Value to test.
 * @returns {boolean}   Is value numeric or not?
 */
function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Is the supplied value a boolean type?
 *
 * @public
 * @param {*} value     Value tp test.
 * @returns {boolean}   Is value a boolean?
 */
function isBool(value) {
  return (typeof(value) === "boolean");
}

module.exports = {
  isBool, isNumeric
};