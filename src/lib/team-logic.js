/* 专家团计算逻辑。从 expert-store 获取运行时数据。 */
import { getEx, teamById, teamDomains, teamCmdList, getTeams } from '../stores/expert-store';
import { GATE_ICON } from '../data/expert-data';

export function teamFlow(t) {
  var EX = getEx();
  function any() { for (var i = 0; i < arguments.length; i++) if (t.members.indexOf(arguments[i]) >= 0) return arguments[i]; return null; }
  function byMode(m, skip) { for (var i = 0; i < t.members.length; i++) { if (t.members[i] === skip) continue; var e = EX[t.members[i]]; if (e && e.modes.indexOf(m) >= 0) return t.members[i]; } return null; }
  var f = [], multi = t.members.length > 1;
  var lead = any('software-team-lead');
  if (multi && lead) f.push({ id: 'kickoff', k: 'analyze', title: '协调范围与门禁', who: lead });
  var pm = any('software-product-manager');
  if (pm) f.push({ id: 'requirement', k: 'analyze', title: '分析需求与验收', who: pm });
  var des = any('software-architect', 'ux-designer');
  if (des) f.push({ id: 'design', k: 'design', title: '设计方案与实现计划', who: des });
  var rev = any('code-reviewer', 'read-only-analyst');
  if (rev) f.push({ id: 'precode-review', k: 'review', title: '编码准入评审', who: rev });
  f.push({ id: 'implement', k: 'implement', title: '实现编码任务', who: any('software-engineer', 'frontend-engineer', 'cosmic-form', 'cosmic-workflow', 'cosmic-report', 'cosmic-plugin', 'cosmic-api') || byMode('实现') });
  var sec = any('security-reviewer');
  if (sec) f.push({ id: 'security-review', k: 'review', title: '安全评审', who: sec });
  var qa = any('software-qa-engineer') || byMode('验证', lead);
  if (qa) f.push({ id: 'verify', k: 'test', title: '质量验证', who: qa });
  var itg = lead || any('software-architect') || byMode('集成');
  if (multi && itg) f.push({ id: 'integrate', k: 'integrate', title: '集成与交付确认', who: itg });
  return f;
}

export function teamGates(t) { return Array.isArray(t && t.gates) ? t.gates : []; }
export function hasGate(t, stepId) { return teamGates(t).indexOf(stepId) >= 0; }
export function activeGates(t, flow) { var f = flow || teamFlow(t); return f.filter(function (s) { return hasGate(t, s.id); }); }
export function toggleGate(t, stepId) { if (!t) return; if (!Array.isArray(t.gates)) t.gates = []; var i = t.gates.indexOf(stepId); if (i >= 0) t.gates.splice(i, 1); else t.gates.push(stepId); }

export function teamLint(t) {
  var w = [], canImpl = false, canVerify = false;
  t.members.forEach(function (id) { var e = getEx()[id]; if (e && e.modes.indexOf('实现') >= 0) canImpl = true; if (e && e.modes.indexOf('验证') >= 0) canVerify = true; });
  if (!canImpl) w.push('没有成员具备「实现」工作模式，实现任务无人可领取。');
  if (!canVerify) w.push('没有成员具备「验证」工作模式，产出不会被检查，建议加入「软件测试工程师」。');
  return w;
}

export function teamCoverage(t) {
  var best = {};
  (t.members || []).forEach(function (id) {
    var e = getEx()[id]; if (!e) return;
    (e.comp || []).forEach(function (v) {
      var c = typeof v === 'string' ? parseCompInline(v) : v;
      if (!best[c.id] || c.rank > best[c.id].rank) best[c.id] = c;
    });
  });
  return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.rank - a.rank || a.name.localeCompare(b.name); });
}

import { parseComp } from './utils';
function parseCompInline(v) { return parseComp(v); }

export { teamById, teamDomains, teamCmdList, getTeams };
export { GATE_ICON };
