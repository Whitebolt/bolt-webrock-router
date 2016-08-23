'use strict';

const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

function _runApp(app) {
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

function runApp(app) {
  return bolt.fire(()=>_runApp(app), 'runApp', app).then(() => app);
}

module.exports = {
  runApp
};
