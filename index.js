'use strict';

const config = require('./server.json');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World on port ' + config.port);
});

app.listen(config.port, () => {
  console.log('Express Listening on port ' + config.port);
});