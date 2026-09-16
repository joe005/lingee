import { useSyncExternalStore } from 'react';

/* 兼容层：在 bridge 完全删除前，仍从 window.__lingeeBridge 读取。
   新代码应直接 import from '../stores/*' */
function getNamespace(namespace) {
  return typeof window !== 'undefined' ? window.__lingeeBridge?.[namespace] : undefined;
}

export function useOpenBridgeModal(namespace) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const ns = getNamespace(namespace);
      if (!ns) return () => {};
      return ns.subscribe(onStoreChange);
    },
    () => getNamespace(namespace)?.getOpenModal() ?? null,
    () => null,
  );
}

export function useBridgeNamespace(namespace) {
  return getNamespace(namespace);
}

export function useBridgeVersion(namespace) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const ns = getNamespace(namespace);
      if (!ns) return () => {};
      return ns.subscribe(onStoreChange);
    },
    () => getNamespace(namespace)?.getVersion() ?? 0,
    () => 0,
  );
}
