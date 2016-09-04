'use strict';

const Promise = require('bluebird');
const dbBolt = require('./bolt/database');
const pm2 = require('bluebird').promisifyAll(require('pm2'));
const _ = require('lodash');
const linuxUser = require('linux-user');
const chown = Promise.promisify(require('chownr'));

const config = require('/etc/bolt/server.json');
const processFileProperties = Object.keys(require('pm2/lib/CLI/schema.json'));
const boltConfigProperties = ['port', 'root', 'accessLog', 'template', 'databases', 'secret'];


function parseConfig(config) {
  config.script = __dirname + '/app.js';
  let template = _.template(JSON.stringify(config));
  return JSON.parse(template(config));
}

function loadConfig(name) {
  return dbBolt.loadMongo(config.db)
    .then(db=>db.collection('configs').findOne({name}))
    .then(parseConfig);
}

function getPm2Instances(name) {
  return pm2.listAsync()
    .filter(apps=>(apps.name === name));
}

function removeOldInstances(pm2Config) {
  return getPm2Instances(pm2Config.name).then(apps=>(
    apps.length ?
      Promise.all(apps.map(app=>pm2.deleteAsync(app.pm2_env.pm_id))) :
      true
  ));
}

function startInstance(pm2Config, boltConfig) {
  pm2.startAsync(pm2Config).then(app=>{
    const id = app[0].pm2_env.pm_id;
    pm2.sendDataToProcessId(id, {type:'config', data:boltConfig, id, topic:'config'});
    pm2.disconnect();
  });
}

function launchPm2(siteConfig) {
  let pm2Config = _.pick(siteConfig, processFileProperties);
  let boltConfig = _.pick(siteConfig, boltConfigProperties);

  return pm2.connectAsync()
    .then(()=>removeOldInstances(pm2Config))
    .then(()=>startInstance(pm2Config, boltConfig));
}

function createUserIfNotCreated(isUser, siteConfig) {
  if (!isUser) {
    var options = {username: siteConfig.userName};
    if (siteConfig.homeDir) options.d = siteConfig.homeDir;
    return linuxUser.addUser(options)
      .then(result=>linuxUser.getUserInfo(siteConfig.userName));
  }
  return true;
}

function addUser(siteConfig) {
  if (siteConfig.userName) {
    return linuxUser.isUser(siteConfig.userName).then(
      isUser=>createUserIfNotCreated(isUser, siteConfig)
    ).then(
      isUser=>linuxUser.getUserInfo(siteConfig.userName)
    ).then(user=>{
      return chown(user.homedir, user.uid, user.gid).then(
        result=>user
      );
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
