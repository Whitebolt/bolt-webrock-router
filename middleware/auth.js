'use strict';

const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const Promise = require('bluebird');
const bcrypt = Promise.promisifyAll(require('bcrypt'));
const compareAsync = Promise.promisify(bcrypt.compare);


function init(app){
  function loginUser(username, password){
    console.log("B", username);
    return getUserByAccount(username)
      .then(user => {
        console.log(user); return user;
      })
      .then(user => compareAsync(password, user.password));
  }

  function getUserByAccount(username) {
    return app.db.collection('users').findOne({
      $or:[{accountEmail: username}, {userName: username}]
    }).then(user => (user?user:Promise.reject('User not found')));
  }

  function getUserRecordById(id) {
    return app.db.collection('users')
      .findOne({_id: id.toString()})
      .then(user => (user?user:Promise.reject('User not found')));
  }

  function login(username, password, callback){
    console.log("A", username, password);
    loginUser(username, password).nodeify(callback);
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
    const path = req.path.toString();

    ((!(passport && passport.user)) ?
      populateAnnoymousSessionData(req, res, next) :
      populateUserSessionData(req, res, next)
    )
      //.then(() => console.log(req.session))
      .finally(next);
  });

  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login' }),
    (request, response) => response.redirect('/')
  );

  app.post('/change-password', function(req, res, next){
    var id = req.session.passport.user;

    getUserRecordById(id).then(user => {
        if (req.body.password1 === req.body.password2) {
          user.password = req.body.password1;
          app.db.collection('users')
            .save(user)
            .then(next, next);
        } else {
          next();
        }
    }, next);
  });
}

init.priority = 2;
module.exports = init;