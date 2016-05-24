'use strict';

const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const path = require('path');

function loadTextFile(filename) {
  return readFile(filename, 'utf8');
}

function load(roots, views) {
  return bolt
    .directoriesInDirectory(roots, ['templates'])
    .map(dirPath => bolt.filesInDirectory(dirPath, 'ejs'))
    .then(viewPaths => bolt.flatten(viewPaths))
    .map(viewPath => {
      let templateName = path.basename(viewPath, '.ejs');
      return loadTextFile(viewPath).then(viewTxt => {
        views[templateName] = bolt.compileEjs(viewTxt, {
          "filename": viewPath
        });
        return views[templateName];
      });
    });
}

function loadTemplates(roots, templates) {
  return bolt.directoriesInDirectory(roots, ['templates']).then(templatesPath => {
    return bolt.directoriesInDirectory(templatesPath).map(templatePath => {
      let templateName = path.basename(templatePath);
      templates[templateName] = templates[templateName] || {};
      let template = templates[templateName];

      return bolt.filesInDirectory(templatePath, 'ejs')
        .then(viewPaths => bolt.flatten(viewPaths))
        .map(viewPath => {
          let viewName = path.basename(viewPath, '.ejs');
          return loadTextFile(viewPath).then(viewTxt => {
            template[viewName] = bolt.compileEjs(viewTxt, {
              "filename": viewPath
            });
            return template[viewName];
          });
        });
    });
  });
}

module.exports = {
  load, loadTemplates
};