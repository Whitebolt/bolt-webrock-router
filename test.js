'use strict';

const linuxUser = require('linux-user');

linuxUser.getUsers().then(
  users=>console.log(users),
  err=>console.error(err)
);