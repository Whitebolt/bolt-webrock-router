'use strict';

const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const Promise = require('bluebird');
const bcrypt = require('bcrypt');
const compare = Promise.promisify(bcrypt.compare);
const useragent = require('useragent');

useragent(true);


function init(app) {
  const hideUserFieldsFromSession = ['password', '_id'];

  function loginUser(username, password) {
    return getUserByAccount(username)
      .then(user=>{
        return compare(password, user.password)
          .then(authenticated =>(!authenticated ? false : user));
      });
  }

  function getUserByAccount(username) {
    return app.db.collection('users').findOne({
      $or:[{accountEmail: username}, {userName: username}]
    }).then(user => (user?user:Promise.reject('User not found')));
  }

  function getHideFieldsProjection(hideFields) {
    let projection = {};
    hideFields.forEach(field=>{projection[field] = false;});
    return projection;
  }

  function getUserRecordById(id, hideFields=[]) {
    return app.db.collection('users')
      .findOne(
        {_id: bolt.mongoId(id)},
        getHideFieldsProjection(hideFields)
      )
      .then(user => (user?user:Promise.reject('User not found')));
  }

  function login(username, password, callback){
    loginUser(username, password).then(user => {
      if (user === false) {
        callback(null, false)
      } else {
        callback(null, user);
      }
    });
  }

  function getGroups(id, tags=[], groups=[]) {
    let users = tags.concat(groups.map(group=>group._id));
    if (id) users.unshift(bolt.mongoId(id));
    let groupCount = groups.length;
    return app.db.collection('groups').find({'users':{$elemMatch:{$in: users}}}).toArray().map(group=>{
      return {_id: bolt.mongoId(group._id), name: group.name}
    }).then(groups=>((groups.length > groupCount) ? getGroups(id, tags, groups) : groups))
  }

  function addTags(userAgent, tags) {
    var agent = useragent.parse(userAgent);
    tags.push('BROWSER:'+agent.family, 'DEVICE:'+agent.device.family, 'OS:'+agent.os.family);
  }

  function populateSessionWithUserData(session, userAgent=''){
    let id = session.passport.user.toString();
    return getUserRecordById(id, hideUserFieldsFromSession)
      .then(user=>{
        session.user = {};
        session.tags = ['LOGGEDIN'];
        addTags(userAgent, session.tags);
        Object.keys(user).forEach(property => {
          session.user[property] = user[property];
        });
        return user;
      })
      .then(user=>getGroups(id, session.tags))
      .then(groups=>{
        session.groups = groups;
        console.log(session);
        return groups;
      })
  }

  function populateUserSessionData(req, res, next){
    return populateSessionWithUserData(req.session, req.headers['user-agent']);
  }

  function populateAnnoymousSessionData(req, res, next){
    let session = req.session;

    session.user = {};
    session.tags = ['NOTLOGGEDIN'];
    addTags(req.headers['user-agent'], session.tags);
    return getGroups('', session.tags).then(groups=>{
      session.groups = groups;
      console.log(session);
    });
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