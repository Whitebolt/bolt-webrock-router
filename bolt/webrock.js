'use strict';

const Promise = require('bluebird');

function webRockSlugger(req, res) {
  const rootPath = '/client/default.asp';

  let pathParts = bolt.getPathPartsFromRequest(req);
  if (!pathParts.length) return Promise.resolve(req.path);
  let idKey = pathParts.shift();
  if (req && req.app && req.app.dbs && req.app.dbs.webRock) {
    return req.app.dbs.webRock.query('SELECT * FROM page WHERE id_key="'+idKey+'"').spread(rows=>{
      if (rows.length) {
        let query = {
          wa_object_id: 1,
          wa_id_key: idKey,
          wa_route: '/' + idKey,
          wa_id: rows[0].id,
          id_key: pathParts.join('/')
        };
        let path = rootPath + '?' + bolt.objectToQueryString(query);
        bolt.fire("webRockReroute", path);
        return path;
      } else {
        bolt.fire("webRockProxy", req.path);
        return req.path;
      }
    });
  } else {
    bolt.fire("webRockProxy", req.path);
    return Promise.resolve(req.path);
  }
}

module.exports = {
  webRockSlugger
};