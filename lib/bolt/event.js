'use strict';

const Promise = require('bluebird');
const hooks = new Map();

function on(hookName, hook, params={priority:0, context:{}}) {
  if (!hooks.has(hookName)) hooks.set(hookName, []);
  let _hooks = hooks.get(hookName);
  let id = bolt.randomString(32);
  _hooks.push({hook, params, id});
  hooks.set(
    hookName,
    _hooks.sort((a, b) => ((a.params.priority > b.params.priority)?1:((a.params.priority < b.params.priority)?-1:0)))
  );

  return ()=>{ //unregister function
    let _hooks = hooks.get(hookName);
    let index = bolt.findIndex(_hooks, (hook)=>(hook.id === id));
    if (index !== -1) {
      _hooks.splice(index, 1);
    }
  }
}

function once(hookName, hook, params={priority:0, context:{}}) {
  let unreg = on(hookName, (..._params) => {
    unreg();
    return hook.apply(params.context || {}, _params);
  }, params);
}

function fire(hookName, ...params) {
  if (hooks.has(hookName)) {
    return Promise.all(hooks
      .get(hookName)
      .map(hook => hook.hook.apply(
        hook.params.context ||{},
        [hook.params].concat(params.slice())
      ))
    );
  }

  return Promise.resolve();
}

module.exports = {
  on, once, fire
};