'use strict';

function getPathFromRequest(req) {
  let path = req.path.trim().replace(/\/$/, '');

  return ((path === '') ? '/' : path);
}

function getPathPartsFromRequest(req) {
  return getPathFromRequest(req).split('/').filter(part => (part.trim() !== ''));
}

module.exports = {
  getPathFromRequest, getPathPartsFromRequest
};