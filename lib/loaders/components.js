'use strict';

const path = require('path');
const Promise = require('bluebird');

function load(app, loaders, roots) {
    roots = roots || (app.config || {}).root || app.root;
    app.components = app.components || {};

    return bolt
        .directoriesInDirectory(roots, ['components'])
        .map(dirPath => bolt.directoriesInDirectory(dirPath))
        .then(dirPaths => bolt.flatten(dirPaths))
        .map(dirPath => {
            let componentName = path.basename(dirPath);
            app.components[componentName] = app.components[componentName] || {};
            let component = app.components[componentName];
            component.root = dirPath;

            return Promise.all([
                loaders.templates.load(component),
                loaders.controllers.load(component),
                loaders.components.load(component, loaders)
            ]);
        })
}

module.exports = {
  load
};