/* 专家/专家团运行时状态管理。
   替代 main.js 中的 var MY_EXPERTS / var TEAMS / var EX + window.__lingeeBridge.expert 等。
   React 组件通过 useSyncExternalStore 订阅变化。 */
import { EXPERTS as BUILTIN_EXPERTS } from '../data/experts';
import { PRESET_TEAMS } from '../data/teams';
import { AV_KEYS, WORK_MODES, ASK, ASK_FALLBACK, MODE_MATCH, KW_MATCH } from '../data/expert-data';

const TEAM_STORE_KEY = 'lingee_teams';

let myExperts = [];
let teams = PRESET_TEAMS.slice();
let ex = {};
let activePick = { kind: null, id: null, auto: false };
let forcedBuilder = null;

function rebuildEx() {
  ex = {};
  BUILTIN_EXPERTS.concat(myExperts).forEach(function (e) { ex[e.id] = e; });
}

export function getExperts() { return BUILTIN_EXPERTS.concat(myExperts); }
export function getEx() { return ex; }
export function getTeams() { return teams; }
export function getMyExperts() { return myExperts; }
export function getBuiltinExperts() { return BUILTIN_EXPERTS; }
export function getActivePick() { return activePick; }
export function setActivePick(pick) { activePick = pick; notify(); }
export function clearPick() { activePick = { kind: null, id: null, auto: false }; notify(); }
export function pickValid() { return activePick.id && (activePick.kind === 'team' ? teamById(activePick.id) : ex[activePick.id]); }
export function pickName() {
  var o = activePick.kind === 'team' ? teamById(activePick.id) : ex[activePick.id];
  return o ? o.name : '';
}
export function getAvKeys() { return AV_KEYS; }
export function getWorkModes() { return WORK_MODES; }
export function getAskFor(name) { return ASK[name] || ASK_FALLBACK; }
export function getForcedBuilder() { return forcedBuilder; }
export function setForcedBuilder(b) { forcedBuilder = b; }

export function teamById(id) {
  for (var i = 0; i < teams.length; i++) if (teams[i].id === id) return teams[i];
  return null;
}

export function teamDomains(t) {
  if (t && t.domains && t.domains.length) return t.domains;
  var seen = {}, out = [];
  (t && t.members || []).forEach(function (id) {
    var e = ex[id]; if (!e) return;
    (e.tags || []).forEach(function (g) { if (!seen[g]) { seen[g] = 1; out.push(g); } });
  });
  return out;
}

export function addExpert(rec) {
  myExperts.push(rec);
  rebuildEx();
  save();
  notify();
}

export function updateExpert(id, rec) {
  for (var i = 0; i < myExperts.length; i++) {
    if (myExperts[i].id === id) { myExperts[i] = rec; break; }
  }
  rebuildEx();
  save();
  notify();
}

export function deleteExpert(id) {
  var e = ex[id]; if (!e || !e.mine) return;
  myExperts = myExperts.filter(function (x) { return x.id !== id; });
  teams.forEach(function (t) {
    if (t.preset) return;
    t.members = t.members.filter(function (m) { return m !== id; });
    if (t.leadId === id) t.leadId = t.members[0] || null;
  });
  if (activePick.kind === 'expert' && activePick.id === id) clearPick();
  rebuildEx();
  save();
  notify();
}

export function saveTeam(team) {
  var existing = team.id ? teamById(team.id) : null;
  if (existing && !existing.preset) {
    Object.assign(existing, team);
  } else {
    teams.push(team);
  }
  save();
  notify();
}

export function deleteTeam(id) {
  var t = teamById(id); if (!t || t.preset) return;
  teams = teams.filter(function (x) { return x.id !== id; });
  if (activePick.kind === 'team' && activePick.id === id) clearPick();
  save();
  notify();
}

export function teamCmdList(d) {
  return (d.cmds || []).map(function (c) { return [String(c[0] || '').trim(), String(c[1] || '').trim()]; }).filter(function (c) { return c[0]; });
}

export function autoMatch(text, checkedMode) {
  var t = String(text || '');
  var hits = KW_MATCH.filter(function (r) {
    return r.kw.some(function (k) { return t.toLowerCase().indexOf(k.toLowerCase()) >= 0; });
  }).filter(function (r) { return !!ex[r.id]; });

  if (hits.length >= 2) {
    var cosmic = hits.filter(function (r) { return r.id.indexOf('cosmic-') === 0; }).length;
    var pick = cosmic >= 2 ? 'cosmic-team' : 'software-company';
    if (teamById(pick)) return { kind: 'team', id: pick, auto: true };
  }
  if (hits.length === 1) return { kind: 'expert', id: hits[0].id, auto: true };

  var m = checkedMode ? MODE_MATCH[checkedMode] : null;
  if (m && ((m.kind === 'team' && teamById(m.id)) || (m.kind === 'expert' && ex[m.id])))
    return { kind: m.kind, id: m.id, auto: true };

  return teamById('software-company') ? { kind: 'team', id: 'software-company', auto: true } : null;
}

function save() {
  try {
    localStorage.setItem(TEAM_STORE_KEY, JSON.stringify({
      v: 1,
      teams: teams.filter(function (t) { return !t.preset; }).map(function (t) {
        return { id: t.id, name: t.name, by: t.by, desc: t.desc, domains: t.domains || [], gates: t.gates || [], leadId: t.leadId, members: t.members, cmds: t.cmds };
      }),
      experts: myExperts.map(function (e) {
        return { id: e.id, k: e.k, name: e.name, role: e.role, desc: e.desc, tags: e.tags, modes: e.modes, comp: e.comp, cmds: e.cmds };
      })
    }));
  } catch { /* privacy mode */ }
}

function load() {
  try {
    var data = JSON.parse(localStorage.getItem(TEAM_STORE_KEY) || '{}');
    if (data.experts) myExperts = data.experts;
    if (data.teams) teams = PRESET_TEAMS.slice().concat(data.teams.filter(function (t) { return t && t.id; }));
  } catch { /* 隐私模式退化 */ }
  rebuildEx();
}

load();

/* 订阅机制 */
let version = 0;
let listeners = [];
export function subscribe(fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
export function getVersion() { return version; }
function notify() { version++; listeners.slice().forEach(function (fn) { try { fn(); } catch { /* ignore */ } }); }

export function sanitizeExpert(e) {
  if (!e) return null;
  return { id: e.id, k: e.k, name: e.name, role: e.role, by: e.by, desc: e.desc,
           tags: e.tags || [], modes: e.modes || [], comp: (e.comp || []).map(function (c) { return typeof c === 'string' ? require_comp(c) : c; }),
           cmds: e.cmds || [], skills: e.skills, mine: e.mine, ro: e.ro };
}

// parseComp needs to be accessible - import from utils
import { parseComp } from '../lib/utils';
function require_comp(v) { return parseComp(v); }
