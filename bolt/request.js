'use strict';

/**
 * Get the path from a url removing an trailing slashes.
 *
 * @todo  How robust is this? Test and improve.
 * @todo  How safe is this? Ensure it is safe.
 *
 * @public
 * @param {Object} req      The request (express style) to get path from.
 * @returns {string}        The found path or '/'.
 */
function getPathFromRequest(req) {
  let path = req.path.trim().replace(/\/$/, '');

  return ((path === '') ? '/' : path);
}

/**
 * Split a path into parts return an array of each directory part.
 *
 * @todo  How safe is this? Ensure it is safe.
 *
 * @public
 * @param {Object} req      The request (express style) to get path from.
 * @returns {Array}         The path parts.
 */
function getPathPartsFromRequest(req) {
  return getPathFromRequest(req).split('/').filter(part => (part.trim() !== ''));
}

module.exports = {
  getPathFromRequest, getPathPartsFromRequest
};