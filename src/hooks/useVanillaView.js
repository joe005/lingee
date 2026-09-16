import { useEffect, useRef } from 'react';

/* "React shell" 模式：把 vanilla 视图的 DOM 子节点从隐藏的原 div 移到
   React 容器里。DOM 节点移动时事件监听器保留，vanilla JS 继续工作。
   卸载时移回去，下次挂载再移过来。

   这不是最终的 React 化——它让视图进入 React 路由树，但不重写 vanilla
   逻辑。后续可以逐步把 vanilla 的事件处理/状态管理迁移到 React hooks，
   每迁一块就删掉对应的 vanilla 代码。 */

export function useVanillaView(viewId) {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    const source = document.getElementById(viewId);
    if (!container || !source) return;

    // 移动子节点到 React 容器
    while (source.firstChild) {
      container.appendChild(source.firstChild);
    }

    // 初始化函数（如果 bridge 提供了的话）
    const bridge = window.__lingeeBridge;
    if (bridge?.[viewId]?.init) {
      bridge[viewId].init();
    }

    return () => {
      // 卸载时移回原 div
      while (container.firstChild) {
        source.appendChild(container.firstChild);
      }
    };
  }, [viewId]);

  return ref;
}
