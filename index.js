'use strict';

const Promise = require('bluebird');
const requireX = require('require-extra');
const ascii = require('ascii-art');
ascii.Figlet.fontPath = './console_fonts/';



requireX([
  'express',
  './lib/loaders/bolt',
  './lib/loaders/config',
  'colors'
]).spread((express, boltLoader, configLoader, colour) => {
  console.log('\n'+'[' + colour.green(' server init ') + '] ' +Date().toLocaleString());

  const app = express();
  const loaders = {};

  configLoader.load(app).then(config => {
    return boltLoader.load(app.config.root);
  }).then(bolt => {
    return Object.assign(global, {bolt, express});
  }).then(() => requireX.importDirectory('./lib/loaders', {imports: loaders})).then(() => {
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
        .font(bolt.titleCase(app.config.name.split('-').shift()), 'big', 'bright_blue+bold')
        .font(bolt.titleCase(app.config.name.split('-').slice(1).join(' ')), 'big', 'bright_cyan+bold')
        .font(' v' + app.config.version, 'big', 'white+bold', banner => {
          console.log(banner + '\n ' + colour.white(app.config.license) + '\n\n');
        });
    });
  });
});
