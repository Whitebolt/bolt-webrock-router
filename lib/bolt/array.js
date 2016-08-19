'use strict';

/**
 * Take an array containing arrays and return a flat version where items in
 * each are array are concatted to the return array.  This will only go one
 * level deep.
 *
 * @private
 * @param {Array} ary   Array to flatten.
 * @returns {Array}     Flattened array.
 */
function _shallowFlatten(ary) {
  return [].concat(...ary)
}

/**
 * Take an array containing arrays and return a flat version where items in
 * each are array are concatted to the return array.  This will iterate
 * through all array levels to return a totally flat array.
 *
 * @public
 * @param {Array} ary   Array to flatten.
 * @returns {Array}     Flattened array.
 */
function flatten(ary) {
  return _shallowFlatten(ary.map(item => Array.isArray(item) ? flatten(item) : item))
}

/**
 * Always return an array.  If the provided parameter is an array then return
 * it as-is.  If provided param is not an array return param as first item
 * of an array. If a convertFunction is supplied the default non-array to array
 * conversion can be overridden.
 *
 * Function is useful when you always need a value to be array to use array
 * functions (such as map or forEach) on it but cannot guarantee it will be.
 *
 * @public
 * @param {*} ary                                     Item to return or
 *                                                    convert to an array.
 * @param {function} [convertFunction=(ary)=>[ary]]   Function used to convert
 *                                                    to an array if not
 *                                                    already one.
 * @returns {Array}                                   New array or supplied
 *                                                    parameter returned.
 */
function makeArray(ary, convertFunction=(ary)=>[ary]) {
  return (Array.isArray(ary) ? ary : convertFunction(ary));
}

module.exports = {
  flatten, makeArray
};