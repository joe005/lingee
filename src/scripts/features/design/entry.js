import { initDesignSystem } from './index.js';
import { initDesignComponents } from './components.js';
/* Design System 页：本区域的初始化入口，顺序 == 原 main.js。 */

export function initDesignArea() {
  initDesignSystem();             /* 3389 */
  initDesignComponents();         /* 3796 */
}
