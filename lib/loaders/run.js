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
  /*Object.keys(app.controllerRoutes).forEach(route => {
    app.controllerRoutes[route] = app.controllerRoutes[route].sort((a, b) =>
      ((a.priority > b.priority)?1:((a.priority < b.priority)?-1:0))
    );
  });*/

  return bolt.runHook('runApp', app)
    .then(() => _run(app))
    .then(() => bolt.runHook('runAppDone', app))
    .then(() => app);

  //console.log(app.controllerRoutes);


}

module.exports = run;
