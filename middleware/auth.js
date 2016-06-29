'use strict';

const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const Promise = require('bluebird');
const bcrypt = require('bcrypt');
const compare = Promise.promisify(bcrypt.compare);


function init(app){
  function loginUser(username, password){
    return getUserByAccount(username)
      .then(user =>
        compare(password, user.password).then(authenticated =>
          (!authenticated ? false : user)
        )
      );
  }

  function getUserByAccount(username) {
    return app.db.collection('users').findOne({
      $or:[{accountEmail: username}, {userName: username}]
    }).then(user => (user?user:Promise.reject('User not found')));
  }

  function getUserRecordById(id) {
    return app.db.collection('users')
      .findOne({_id: bolt.mongoId(id)})
      .then(user => (user?user:Promise.reject('User not found')));
  }

  function login(username, password, callback){
    loginUser(username, password).then(user => {
      if (user === false) {
        callback(false, { message: 'Could not authenticate specified user and password.' })
      } else {
        callback(true, user);
      }
    });
  }

  function populateSessionWithUserData(session){
    return getUserRecordById(session.passport.user.toString()).then(user => {
      Object.keys(user).forEach(property => {
        session[property] = user[property];
      });
      return user;
    })
  }

  function populateUserSessionData(req, res, next){
    return populateSessionWithUserData(req.session);
  }

  function populateAnnoymousSessionData(req, res, next){
    return Promise.resolve({});
  }

  passport.use(new Strategy(login));

  passport.serializeUser((data, callback) => {
    return callback(null, data._id.toString());
  });

  passport.deserializeUser((id, callback) => {
    getUserRecordById(id).nodeify(callback);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(function(req, res, next){
    const passport = req.session.passport;

    ((!(passport && passport.user)) ?
      populateAnnoymousSessionData(req, res, next) :
      populateUserSessionData(req, res, next)
    )
      .finally(next);
  });
}

init.priority = 2;
module.exports = init;