'use strict';

const Promise = require('bluebird');
const events = new Map();
const topics = new Map();

function on(hookName, hook, params={priority:0, context:{}}) {
  return _on(hookName, hook, params, events);
}

function subscribe(hookName, hook, params={priority:0, context:{}}) {
  return _on(hookName, hook, params, topics);
}

function once(hookName, hook, params={priority:0, context:{}}) {
  let unreg = on(hookName, (..._params) => {
    unreg();
    return hook.apply(params.context || {}, _params);
  }, params);
}

function fire(hookName, ...params) {
  return _fire(hookName, params, events);
}

function broadcast(hookName, ...params) {
  return _fire(hookName, params, topics);
}

function _on(hookName, hook, params={priority:0, context:{}}, events) {
  if (!events.has(hookName)) events.set(hookName, []);
  let _hooks = events.get(hookName);
  let id = bolt.randomString(32);
  _hooks.push({hook, params, id});
  events.set(
    hookName,
    _hooks.sort((a, b) => ((a.params.priority > b.params.priority)?1:((a.params.priority < b.params.priority)?-1:0)))
  );

  return ()=>{ //unregister function
    let _hooks = events.get(hookName);
    let index = bolt.findIndex(_hooks, (hook)=>(hook.id === id));
    if (index !== -1) {
      _hooks.splice(index, 1);
    }
  }
}

function _fire(hookName, params, events) {
  if (events.has(hookName)) {
    return Promise.all(events
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
  on, once, subscribe, fire, broadcast
};