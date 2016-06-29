'use strict';

function replaceLast(txt, searcher, replacer) {
  const n = txt.lastIndexOf(searcher);
  return txt.slice(0, n) + txt.slice(n).replace(searcher, replacer);
}

module.exports = {
  replaceLast
};