import { useSyncExternalStore } from 'react';

/* 订阅 window.__lingeeBridge.collab 广播的"当前该开哪个协作开发弹窗"。
   见 docs/react-migration-plan.md Phase 2、src/scripts/main.js 里的
   _cvModalState/_cvModalSubscribe——vanilla 侧只广播状态，业务判断和数据
   仍然留在那边，这里只是把广播接进 React 的订阅模型。

   main.js 在 index.html 里先于这个模块加载（同步执行完才轮到
   src/main.jsx），所以正常情况下 window.__lingeeBridge.collab 在这里被
   调用时已经就绪；仍然做一次防御性判断，避免脚本加载顺序被改动时白屏。 */
function getBridge() {
  return typeof window !== 'undefined' ? window.__lingeeBridge?.collab : undefined;
}

export function useOpenCollabModal() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const bridge = getBridge();
      if (!bridge) return () => {};
      return bridge.subscribe(onStoreChange);
    },
    () => getBridge()?.getOpenModal() ?? null,
    () => null,
  );
}

export function useCollabBridge() {
  return getBridge();
}
