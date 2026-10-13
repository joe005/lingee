import { initExpertData } from './data.js';
import { initExpertLibrary } from './library.js';
import { initAutoMatch } from './automatch.js';
import { initExpertEditor } from './editor.js';
import { initExpertKnowledge } from './knowledge.js';
import { initTeamModal } from './team-modal.js';
import { initExpertChips } from './chips.js';
/* 智能体与智能体团队：本区域的初始化入口。
   顺序 == 原 main.js 里这几行的顺序；本区域新增模块在这里接线，不用改 main.js。 */

export function initExpertArea() {
  initExpertData();               /* 4234 */
  initExpertLibrary();            /* 4627 */
  initAutoMatch();                /* 4759 */
  initExpertEditor();             /* 4885 */
  initExpertKnowledge();          /* 拆分后新增 */
  initTeamModal();                /* 5034 */
  initExpertChips();              /* 5261 */
}
