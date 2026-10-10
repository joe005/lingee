import { initManagerDatePicker } from './datepicker.js';
import { initManagerDetail } from './detail.js';
import { initManagerInvite } from './invite.js';
import { initManagerMembers } from './members.js';
import { initManagerNav, syncUrl } from './nav.js';
import { initManagerPlan } from './plan.js';
import { initManagerProjects } from './projects.js';
import { initManagerRdTasks } from './rd-tasks.js';
import { initManagerSettings } from './settings.js';
/* 管理板块入口（数据已由 main.js 在任务模块前通过 initManagerData 注册）：计划与任务 → 研发任务 → 项目详情 → 项目列表 → 侧栏菜单与启动路由。
   需在协作开发与专家模块初始化之后调用（复用其人员、智能体与智能体团队数据）。 */

export function initManager() {
  if (!document.getElementById('view-manager')) return;
  initManagerDatePicker();
  initManagerPlan();
  initManagerRdTasks();
  initManagerDetail();
  initManagerMembers();
  initManagerInvite();
  initManagerSettings();
  initManagerProjects(syncUrl);
  initManagerNav();
}
