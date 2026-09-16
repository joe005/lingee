/* 从 main.js 提取的工具函数 */
import { EXPERT_AV, COMP_NAMES, COMP_LEVELS, COMP_RANK } from '../data/expert-data';

export function xav(k) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">' + (EXPERT_AV[k] || EXPERT_AV.eng) + '</svg>');
}

export function xesc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

export function parseComp(v) {
  var p = String(v == null ? '' : v).split('\u00b7');
  var id = (p[0] || '').trim(), lv = (p[1] || '').trim();
  return { id, name: COMP_NAMES[id] || id, lv, level: COMP_LEVELS[lv] || lv, rank: COMP_RANK[lv] || 0 };
}

export function splitList(v) {
  return String(v || '').split(/[、,，\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
}

export function splitLines(v) {
  return String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
}

export function blankExpert() {
  return { k: 'eng', name: '', role: '', desc: '', visibility: 'workspace', tags: [], modes: ['分析', '设计', '实现'], comp: [], cmds: [['', '']] };
}
