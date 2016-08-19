'use strict';

const Promise = require('bluebird');

const events = new Map();
const topics = new Map();
const hooks = new Map();
const defaultOptions = {priority:0, context:{}};

/**
 * Connect to specified hook.  Hook are run in-sequence as a hook is fired from
 * the bolt server.  This is different to an event, which will run at some
 * undefined point after the event is fired.  The server will wait for hooks to
 * return before continuing to the next operation.
 *
 * @public
 * @param {string} hookName                 Hook name to connect to.
 * @param {Function} hookFunction           Hook function to call.
 * @param {Object} [options=defaultOptions] Params to pass to the hook caller.
 */
function hook(hookName, hookFunction, options=defaultOptions) {
  return _on(hookName, hookFunction, options, hooks);
}

/**
 * Connect to a specific event.  Events will fire and then the code continues
 * not waiting for connected functions to run.  These functions will run when
 * server is able to process them.
 *
 * @public
 * @param {string} eventName                Hook name to connect to.
 * @param {Function} eventCallback          Hook function to call.
 * @param {Object} [options=defaultOptions] Params to pass to the event caller.
 */
function on(eventName, eventCallback, options=defaultOptions) {
  return _on(eventName, eventCallback, options, events);
}

/**
 * Connect to a specific event once.  The same as on but only fires once and
 * never again.
 *
 * @public
 * @param {string} eventName                Hook name to connect to.
 * @param {Function} eventCallback          Hook function to call.
 * @param {Object} [options=defaultOptions] Params to pass to the event caller.
 */
function once(eventName, eventCallback, options=defaultOptions) {
  let unreg = on(eventName, (..._params) => {
    unreg();
    return eventCallback.apply(options.context || {}, _params);
  }, options);
}

/**
 * Subscribe to a specific topic.  Topics are not the same as events or hooks.
 * Events and hooks are about stuff that has happened, topics are designed for
 * data streams.  Although, events and topics could be used inter-changeably,
 * they exist separately so streaming data has it's own methods.
 *
 * A good example of a topic might be the event log itself, one method could
 * subscribe to this stream to output to the console;  another method might
 * link the same stream to web-socket to be streamed to an admin users
 * browser console.
 *
 * @note All topics will also fire a hook of the same name; so, you can hook into
 * topics; although, you would normally only hook into events.
 *
 * @public
 * @param {string} topicName                Topic name to subscribe to.
 * @param {Function} topicHandler           Handler function to fire on
 *                                          topic data.
 * @param {Object} [options=defaultOptions] Params to pass to the topic caller.
 */
function subscribe(topicName, topicHandler, options=defaultOptions) {
  return _on(topicName, topicHandler, options, topics);
}

/**
 * Fire a specified event/hook, passing the given params to any
 * subscribed functions.  Here events and hooks are the same.  Any fired
 * data here can be connected to via either or 'on' or 'hook'; the only
 * difference is whether fire waits for a return before continuing. Fire waits
 * for hooks but not ons.
 *
 * @public
 * @param {string} hookName   Hook name to fire.
 * @param {Array} params      Parameters to pass to the subscribed functions.
 * @returns {Promise}         Promise fulfilled when all hooks fired.  The
 *                            in-sequence running will only work if you wait
 *                            for this promise to return.
 */
function fire(hookName, ...params) {
  return _fire(hookName, params, events);
}

/**
 * Stream the given data via the given topic channel.
 *
 * @public
 * @param {string} topicName  Topic name to stream to.
 * @param {Array} params      Parameters to pass to handler functions.
 * @returns {Promise}         Promise fulfilled when all hooks fired.  The
 *                            in-sequence running will only work if you wait
 *                            for this promise to return.
 */
function broadcast(topicName, ...params) {
  return _fire(topicName, params, topics);
}

/**
 * Setup a subscription for a specific hook, event or topic with given handler
 * function and options.
 *
 * @private
 * @param {string} hookName     Hook/Event/Topic name to connect to.
 * @param {Function} handler    Handler function to call when hook, event or
 *                              topic is fired.
 * @param {Object} options      Options object for this on setup.
 * @param {Map} lookup          Map object to lookup handlers in.
 * @returns {Function}          An unregister function for this connection.
 */
function _on(hookName, handler, options, lookup) {
  let id = _onCreate(hookName, handler, options, lookup);
  return _onCreateUnregister(hookName, lookup, id);
}

/**
 * Create an on handler for _on.
 *
 * @private
 * @param {string} hookName     Hook/Event/Topic name to connect to.
 * @param {Function} handler    Handler function to call when hook, event or
 *                              topic is fired.
 * @param {Object} options      Options object for this on setup.
 * @param {Map} lookup          Map object to lookup handlers in.
 * @returns {string}            A id for this specific on.
 */
function _onCreate(hookName, handler, options, lookup) {
  if (!lookup.has(hookName)) lookup.set(hookName, []);
  let hooks = lookup.get(hookName);
  let id = bolt.randomString(32);
  hooks.push({handler, options, id});
  lookup.set(hookName, hooks.sort(_hookPrioritySorter));
  return id;
}

/**
 * Create a function for unregistering a specific on.
 *
 * @private
 * @param {string} hookName     Hook/Event/Topic name to connect to.
 * @param {Map} lookup          Map object to lookup handlers in.
 * @param {string} id           Id of on to unregister.
 * @returns {Function}          The unregister function.
 */
function _onCreateUnregister(hookName, lookup, id) {
  return ()=>{
    let hooks = lookup.get(hookName);
    let index = bolt.findIndex(hooks, (hook)=>(hook.id === id));
    if (index !== -1) hooks.splice(index, 1);
  };
}

/**
 * Sorter for an array of hooks or events according to their priority.  This is
 * not so important with events which are run as and when.  However, specific
 * order could be vital with hooks.
 *
 * @param {number} a          First array item to compare.
 * @param {number} b          Second array item to compare.
 * @returns {number} [-1|0|1] Calculated order for a and b.
 * @private
 */
function _hookPrioritySorter(a, b) {
  return (
    ((a.options.priority || 1) > (b.options.priority || 1)) ?
      1 :
      (((a.options.priority || 1) < (b.options.priority || 1)) ?
          -1 :
          0
      )
  );
}

/**
 * Fire a given hook/event/topic with the given parameters. Hooks are fired
 * in-sequence where-as events and topics are fired as and when.
 *
 * @private
 * @param {string} hookName Event, Hook or Topic to fire.
 * @param {Array} params    Parameters to pass to any handlers.
 * @param {Map} lookup      Lookup to use (either topics or events - never
 *                          hooks as this is always fired).
 * @returns {Promise}       The promise fulfilled when all hooks fired.
 */
function _fire(hookName, params, lookup) {
  process.nextTick(()=>_fireEvents(hookName, params, lookup));
  return _fireHooks(hookName, params);
}

/**
 * Fire a given event or topic with the given parameters passed to the handler.
 *
 * @private
 * @param {string} hookName Event, Hook or Topic to fire.
 * @param {Array} params    Parameters to pass to any handlers.
 * @param {Map} lookup      Lookup to use (either topics or events - never
 *                          hooks as this is always fired).
 */
function _fireEvents(hookName, params, lookup) {
  if (lookup.has(hookName)) {
    lookup.get(hookName).forEach(hook => {
      process.nextTick(()=>hook.handler.apply(
        hook.options.context ||{},
        [hook.options].concat(params.slice())
      ));
    });
  }
}

/**
 * Fire a given hook with given parameters passed to the handler.
 *
 * @private
 * @param {string} hookName Event, Hook or Topic to fire.
 * @param {Array} params    Parameters to pass to any handlers.
 * @returns {Promise}       Promise fulfilled when all hooks fired.  The
 *                          in-sequence running will only work if you wait
 *                          for this promise to return.
 */
function _fireHooks(hookName, params) {
  return (hooks.has(hookName) ?
    Promise.all(hooks
      .get(hookName)
      .map(hook =>
        hook.handler.apply(hook.options.context || {}, [hook.options].concat(params.slice()))
      )
    ) :
    Promise.resolve()
  );
}

module.exports = {
  on, once, hook, subscribe, fire, broadcast, _eventDefaultParams: defaultOptions
};