'use strict';


const readFile = require('bluebird').promisify(require('fs').readFile);


function run(app) {
  app.listen(app.config.port, () => {
    console.log('[' + colour.green(' listen ') + '] ' + 'Bolt Server on port ' + colour.green(app.config.port) + '\n\n');
    readFile('./welcome.txt', 'utf-8').then(welcome => {
      console.log(welcome);
      console.log('\n'+'[' + colour.green(' load complete ') + '] ' + Date().toLocaleString());
    });
  });
}

module.exports = run;
