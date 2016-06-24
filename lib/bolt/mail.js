'use strict';

const nodemailer = require('nodemailer');
const Promise = require('bluebird');

function sendEmail(app, email) {
  nodemailer.createTransport({
    host: 'gabriel.whitebolt',
    ignoreTLS: true,
    secure: false
  }).sendMail(email).then(info => {
    console.log('Message sent: ' + info.response);
    return info;
  }, err => {
    console.log(err);
  });

}

module.exports = {
  sendEmail
};