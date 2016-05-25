'use strict';

const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const is = require('./is');
const array = require('./array');
const requireX = require('require-extra');
const lstat = Promise.promisify(fs.lstat);

function getRoot() {
  return path.dirname(process.argv[1]);
}

function getCallerFileName() {
  let prepareStackTrace = Error.prepareStackTrace;
  let err = new Error();
  let callerfile;
  let currentfile;

  try {
    Error.prepareStackTrace = (err, stack) => stack;
    currentfile = err.stack.shift().getFileName();
    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName();
      if(currentfile !== callerfile) break;
    }
  } catch (err) {}

  Error.prepareStackTrace = prepareStackTrace;
  return callerfile;
}

function directoriesInDirectory(dirPath, filter) {
  return ((Array.isArray(dirPath)) ?
      _directoriesInDirectories(dirPath) :
      _directoriesInDirectory(dirPath)
  ).filter(dirPath => {
    return (filter && filter.length) ?
    filter.indexOf(path.basename(dirPath)) !== -1 :
      true;
  });
}

function _directoriesInDirectories(dirPaths) {
  return Promise.all(
    dirPaths.map(dirPath => directoriesInDirectory(dirPath))
  ).then(dirPaths => array.flatten(dirPaths));
}

function _directoriesInDirectory(dirPath) {
  dirPath = path.resolve(path.dirname(getCallerFileName()), dirPath);

  return Promise.promisify(fs.readdir)(dirPath)
    .then(file => file, err => [])
    .map(filename => path.join(dirPath, filename))
    .filter(fileName => lstat(fileName).then(stat => stat.isDirectory()))
    .map(dirName => path.resolve(dirPath, dirName));
}

function filesInDirectory(dirPath, ext = 'js') {
  dirPath = path.resolve(path.dirname(getCallerFileName()), dirPath);
  let xExt = new RegExp('\.' + ext);

  return Promise.promisify(fs.readdir)(dirPath)
    .then(file => file, err => [])
    .filter(fileName => xExt.test(fileName))
    .map(fileName => path.resolve(dirPath, fileName))
}


module.exports = {
  filesInDirectory, directoriesInDirectory,
  getCallerFileName, getRoot, require: requireX
};