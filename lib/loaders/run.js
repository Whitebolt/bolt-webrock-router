'use strict';

const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

function _run(app) {
  return new Promise(resolve => {
    app.listen(app.config.port, () => {
      console.log('[' + colour.green(' listen ') + '] ' + 'Bolt Server on port ' + colour.green(app.config.port) + '\n\n');
      readFile('./welcome.txt', 'utf-8').then(welcome => {
        console.log(welcome);
        console.log('\n'+'[' + colour.green(' load complete ') + '] ' + Date().toLocaleString());
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
