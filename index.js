'use strict';

const colour = require('colors');
const Promise = require('bluebird');
const ascii = require('ascii-art');
const readFile = Promise.promisify(require('fs').readFile);
ascii.Figlet.fontPath = './console_fonts/';

console.log('\n'+'[' + colour.green(' server init ') + '] ' +Date().toLocaleString());


require('require-extra')([
  'express',
  './lib/bolt/files',
  './lib/loaders/bolt',
  process.argv[2]
]).spread((express, boltFs, boltLoader, config) => {
  const app = express();
  const loaders = {};

  app.config = config;
  app.config.template = app.config.template || 'index';

  boltLoader.load(app.config.root).then(bolt => {
    return Object.assign(global, {bolt, express});
  }).then(() => boltFs.importDirectory('./lib/loaders', loaders)).then(() => {
    return loaders.databases.load(app);
  }).then(() => {
    return Promise.all([
      loaders.middleware.load(app),
      loaders.routes.load(app),
      loaders.components.load(app, loaders),
      loaders.templates.load(app)
    ]);
  }).then(() => {
    app.listen(app.config.port, () => {
      console.log('[' + ' listen '.green + '] ' + 'Bolt Server on port ' + app.config.port.toString().green + '\n\n');
      ascii
        .font('Bolt', 'big', 'bright_blue+bold')
        .font('Server', 'big', 'bright_cyan+bold')
        .font(' v3.0', 'big', 'white+bold', banner => {
          readFile('./LICENCE.md', 'utf-8').then(licence => {
            console.log(banner + '\n ' + colour.white(licence) + '\n\n');
          });
        });
    });
  });
});
