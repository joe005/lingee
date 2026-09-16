/* 弹窗开关状态管理。替代 main.js 的 _makeModalBridge + window.__lingeeBridge.<ns>。
   每个 namespace 一份状态，React 通过 useSyncExternalStore 订阅。 */

const stores = {};

function getStore(ns) {
  if (!stores[ns]) stores[ns] = { name: null, version: 0, listeners: [] };
  return stores[ns];
}

export function openModal(ns, name) {
  var s = getStore(ns);
  s.name = name;
  s.version = 0;
  s.listeners.slice().forEach(function (fn) { try { fn(); } catch { /* ignore */ } });
}

export function closeModal(ns) {
  var s = getStore(ns);
  s.name = null;
  s.version = 0;
  s.listeners.slice().forEach(function (fn) { try { fn(); } catch { /* ignore */ } });
}

export function isOpen(ns, name) {
  var s = stores[ns];
  return s ? s.name === name : false;
}

export function getOpenModal(ns) {
  var s = stores[ns];
  return s ? s.name : null;
}

export function getVersion(ns) {
  var s = stores[ns];
  return s ? s.version : 0;
}

export function touch(ns) {
  var s = getStore(ns);
  s.version++;
  s.listeners.slice().forEach(function (fn) { try { fn(); } catch { /* ignore */ } });
}

export function subscribe(ns, fn) {
  var s = getStore(ns);
  s.listeners.push(fn);
  return function () {
    var i = s.listeners.indexOf(fn);
    if (i >= 0) s.listeners.splice(i, 1);
  };
}

/* React hooks */
import { useSyncExternalStore } from 'react';

export function useOpenModal(ns) {
  return useSyncExternalStore(
    function (cb) { return subscribe(ns, cb); },
    function () { return getOpenModal(ns); },
    function () { return null; },
  );
}

export function useModalVersion(ns) {
  return useSyncExternalStore(
    function (cb) { return subscribe(ns, cb); },
    function () { return getVersion(ns); },
    function () { return 0; },
  );
}
