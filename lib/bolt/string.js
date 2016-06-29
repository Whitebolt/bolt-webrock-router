'use strict';

function replaceLast(txt, searcher, replacer) {
  const n = txt.lastIndexOf(searcher);
  return txt.slice(0, n) + txt.slice(n).replace(searcher, replacer);
}

function randomString(length) {
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');

  if (! length) {
    length = Math.floor(Math.random() * chars.length);
  }

  var str = '';
  for (var i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

module.exports = {
  replaceLast, randomString
};