'use strict';

const Promise = require('bluebird');

function query(db, _query) {
  return new Promise((resolve, reject) => {
    db.query(_query, (err, rows)=>{
      if (err) return reject(err);
      return resolve(rows);
    });
  });
}

function webRockSlugger(req, res) {
  const rootPath = '/client/default.asp';

  let pathParts = bolt.getPathPartsFromRequest(req);
  if (!pathParts.length) return Promise.resolve(req.path);
  let idKey = pathParts.shift();
  if (req && req.app && req.app.dbs && req.app.dbs.webRock) {
    return query(req.app.dbs.webRock, 'SELECT * FROM page WHERE id_key="'+idKey+'"').then(rows=>{
      if (rows.length) {
        let query = {
          wa_object_id: 1,
          wa_id_key: idKey,
          wa_route: '/' + idKey,
          wa_id: rows[0].id,
          id_key: pathParts.join('/')
        };

        return rootPath + '?' + bolt.objectToQueryString(query);
      } else {
        return req.path;
      }
    }).then(path=>{
      bolt.fire("webRockReroute", path);
      return path;
    })
  } else {
    bolt.fire("webRockReroute", req.path);
    return Promise.resolve(req.path);
  }
}

module.exports = {
  webRockSlugger
};