'use strict';

const Promise = module.parent.require('bluebird');

function webRockAuthRouter(app) {
  return (req, res, next)=>{
    if (req.body.wr_password && req.body.wr_username && req.body.wr_user_login) {
      let [username, password] = [req.body.wr_username, req.body.wr_password];
      delete req.body.wr_username;
      delete req.body.wr_password;
      delete req.body.wr_user_login;
    }
  };
}

webRockAuthRouter.priority = 8;
webRockAuthRouter.method = 'post';

module.exports = webRockAuthRouter;
