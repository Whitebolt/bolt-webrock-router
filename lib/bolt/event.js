'use strict';

const Promise = require('bluebird');

const events = new Map();
const topics = new Map();
const hooks = new Map();
const defaultOnParams = {priority:0, context:{}};


function hook(hookName, hook, params=defaultOnParams) {
  return _on(hookName, hook, params, hooks);
}

function on(hookName, hook, params=defaultOnParams) {
  return _on(hookName, hook, params, events);
}

function subscribe(hookName, hook, params=defaultOnParams) {
  return _on(hookName, hook, params, topics);
}

function once(hookName, hook, params=defaultOnParams) {
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

function _on(hookName, hook, params, events) {
  if (!events.has(hookName)) events.set(hookName, []);
  let _hooks = events.get(hookName);
  let id = bolt.randomString(32);
  _hooks.push({hook, params, id});
  events.set(
    hookName,
    _hooks.sort((a, b) => (((a.params.priority || 1) > (b.params.priority || 1))?1:(((a.params.priority || 1) < (b.params.priority || 1))?-1:0)))
  );

  return ()=>{ //unregister function
    let _hooks = events.get(hookName);
    let index = bolt.findIndex(_hooks, (hook)=>(hook.id === id));
    if (index !== -1) {
      _hooks.splice(index, 1);
    }
  }
}

function fireEvents(hookName, params, events) {
  if (events.has(hookName)) {
    events.get(hookName).forEach(hook => {
      process.nextTick(()=>hook.hook.apply(
        hook.params.context ||{},
        [hook.params].concat(params.slice())
      ));
    });
  }
}

function fireHooks(hookName, params) {
  return (hooks.has(hookName) ?
    Promise.all(hooks
      .get(hookName)
      .map(hook =>
        hook.hook.apply(hook.params.context || {}, [hook.params].concat(params.slice()))
      )
    ) :
    Promise.resolve()
  );
}

function _fire(hookName, params, events) {
  process.nextTick(()=>fireEvents(hookName, params, events));
  return fireHooks(hookName, params);
}

module.exports = {
  on, once, hook, subscribe, fire, broadcast, _eventDefaultParams: defaultOnParams
};