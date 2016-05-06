'use strict';

const express = require('express');
const app = express();
app.config = require('./server.json');

middlewareLoader(app);

app.get('/', (req, res) => {
  res.send('Hello World on port ' + app.config.port);
});

app.listen(app.config.port, () => {
  console.log('Express Listening on port ' + app.config.port);
});

function middlewareLoader(app) {
  console.log(Array.isArray(app.config.middleware));
  app.config.middleware.forEach(middleware => {
    require('./middleware/' + middleware)(app);
  });
} 