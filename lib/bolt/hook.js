'use strict';

const Promise = require('bluebird');
const hooks = new Map();

function registerHook(hookName, hook, params={priority:0, context:{}}) {
  if (!hooks.has(hookName)) hooks.set(hookName, []);
  hooks.get(hookName).push({hook, params});
}

function runHook(hookName, ...params) {
  if (hooks.has(hookName)) {
    return Promise.all(hooks
      .get(hookName)
      .sort((a, b) => ((a.params.priority > b.params.priority)?1:((a.params.priority < b.params.priority)?-1:0)))
      .map(hook => hook.hook.apply(
        hook.params.context ||{},
        [hook.params].concat(params.slice())
      ))
    );
  }

  return Promise.resolve();
}

module.exports = {
  registerHook, runHook
};