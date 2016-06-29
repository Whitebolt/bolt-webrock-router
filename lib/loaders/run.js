'use strict';

const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

function _run(app) {
  return new Promise(resolve => {
    app.listen(app.config.port, () => {
      bolt.fire('appListening', app.config.port);
      readFile('./welcome.txt', 'utf-8').then(welcome => {
        console.log(welcome);
        return welcome;
      }).then(() => resolve(app));
    });
  });
}

function run(app) {
  return bolt.fire('runApp', app)
    .then(() => _run(app))
    .then(() => bolt.fire('runAppDone', app))
    .then(() => app);
}

module.exports = run;
