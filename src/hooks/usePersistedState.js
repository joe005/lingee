import { useEffect, useState } from 'react';

/* 统一的本地持久化 hook —— 见 docs/react-migration-plan.md §8.6。
   现状清单里的 9 个 key（lingee_auth_session、chatPreviewOpen、
   sidebarCollapsed、TEAM_STORE_KEY……）目前都还挂在未迁移的 vanilla
   视图上，本次 Phase 0/1 没有改动那些视图的逻辑，所以暂时没有把它们
   接进来——贸然把仍由 main.js 管理的状态改成两边都读写，反而会制造新的
   不一致。这个 hook 是给后续 Phase 2/3 迁移对应功能时统一使用的基础设施，
   写法上支持 localStorage 与 sessionStorage 两种。

   用法：const [value, setValue] = usePersistedState('key', initial) */
export function usePersistedState(key, initialValue, { storage = 'local' } = {}) {
  const store = storage === 'session' ? window.sessionStorage : window.localStorage;

  const [value, setValue] = useState(() => {
    try {
      const raw = store.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value === undefined) {
        store.removeItem(key);
      } else {
        store.setItem(key, JSON.stringify(value));
      }
    } catch {
      /* 隐私模式 / 存储被禁用时静默失败，行为退化为纯内存状态 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return [value, setValue];
}
