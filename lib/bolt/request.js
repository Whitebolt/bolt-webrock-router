'use strict';

function getPathFromRequest(req) {
  let path = req.path.trim().replace(/\/$/, '');

  return ((path === '') ? '/' : path);
}

module.exports = {
  getPathFromRequest
};