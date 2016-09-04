'use strict';

const Promise = require('bluebird');
const mongo = require('mongodb');
const pm2 = require('bluebird').promisifyAll(require('pm2'));
const config = require('./server.json');
const lodash = require('lodash');
const linuxUser = require('linux-user');
const chown = Promise.promisify(require('chownr'));


function loadMongo(options) {
  return mongo.MongoClient.connect(createMongoUrl(options), {
    uri_decode_auth: true,
    promiseLibrary: Promise
  });
}

function createMongoUrl(options) {
  options.server = options.server || 'localhost';
  options.port = options.port || 27017;

  return `mongodb://${createMongoAuthenticationPart(options)}${options.server}:${options.port}/${options.database}${options.username ? '?authSource=' + options.adminDatabase : ''}`
}

function createMongoAuthenticationPart(options) {
  if (options.username) {
    options.adminDatabase = options.adminDatabase || 'admin';
    return encodeURIComponent(options.username)
      + (options.password ? ':' + encodeURIComponent(options.password) : '')
      + '@';
  }

  return '';
}

function loadConfig(name) {
  return loadMongo(config.db)
    .then(db=>db.collection('configs').findOne({name}))
    .then(doc=>{
      let template = lodash.template(JSON.stringify(doc));
      return JSON.parse(template(doc));
    }).then(siteConfig=>{
      siteConfig.script = __dirname + '/app.js';
      return siteConfig;
    });
}

function mapObj(obj, mapKeys) {
  let _obj = {};
  mapKeys.forEach(key=>{
    if (obj.hasOwnProperty(key)) _obj[key] = obj[key];
  });
  return _obj;
}

function launchPm2(siteConfig) {
  let _siteConfig = mapObj(siteConfig, ['name', 'script', 'args', 'cwd', 'out_file', 'error_file']);

  return pm2.connectAsync()
    .then(()=>pm2.listAsync())
    .filter(apps=>(apps.name === _siteConfig.name))
    .then(apps=> {
      if (apps.length) return pm2.deleteAsync(_siteConfig.name);
    })
    .then(()=>pm2.startAsync(_siteConfig))
    .then(app=>{
      const id = app[0].pm2_env.pm_id;
      pm2.sendDataToProcessId(id, {
        type: 'config',
        data: siteConfig,
        id,
        topic: 'config'
      });
      pm2.disconnect();
    });
}

function addUser(siteConfig) {
  if (siteConfig.userName) {
    return linuxUser.isUser(siteConfig.userName).then(isUser=>{
      if (!isUser) {
        var options = {username: siteConfig.userName};
        if (siteConfig.homeDir) options.d = siteConfig.homeDir;
        return linuxUser.addUser(options)
          .then(result=>linuxUser.getUserInfo(siteConfig.userName));
      }
      return linuxUser.getUserInfo(siteConfig.userName);
    }).then(user=>{
      return chown(user.homedir, user.uid, user.gid).then(result=>user);
    }).then(user=>{
      siteConfig.uid = user.uid;
      siteConfig.gid = user.gid;
      return siteConfig;
    });
  } else {
    return siteConfig;
  }
}

loadConfig('whitebolt.net').then(
  siteConfig=>addUser(siteConfig)
).then(
  siteConfig=>launchPm2(siteConfig),
  err=>console.log(err)
);
