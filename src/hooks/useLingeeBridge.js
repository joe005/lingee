import { useSyncExternalStore } from 'react';

/* 通用版 useCollabBridge：订阅 window.__lingeeBridge.<namespace> 广播的
   "当前该开哪个弹窗"。Phase 2b（新建应用/附件关联、专家/专家团、ERP 环境、
   快捷键面板）延续 Phase 2（useCollabBridge.js）验证过的同一套桥接模式，
   只是命名空间不同——业务判断仍然留在 src/scripts/main.js，这里只把广播
   接进 React 的订阅模型。见 docs/react-migration-plan.md Phase 2。 */
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

/* 订阅 bridge 的 version 变化——当 main.js 调 bridge.touch() 时
   （例如 memberModal 修改了 teamDraft 后），React 侧 useSyncExternalStore
   检测到 version 递增，触发依赖该 version 的 useMemo 重新读取 draft。 */
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
