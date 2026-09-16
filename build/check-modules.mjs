#!/usr/bin/env node
/* 拆分后的模块自检。三件事：
   1. import 的名字对方确实导出了（否则整个模块图报 SyntaxError，页面一片死寂）
   2. 没有对 import 绑定赋值（import 是只读的，运行到才报 TypeError）
   3. 没有用了却没 import 的跨模块符号
   npm run check 跑它，比在浏览器里撞见快得多。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/scripts');

/* 清空字符串/模板串/注释/正则的内容，只留代码骨架 */
function stripCode(t) {
  let out = '', i = 0;
  const regexPos = (j) => { for (let k = j - 1; k >= 0; k--) { const c = t[k]; if (/\s/.test(c)) continue; return !/[)\]\w$'"`]/.test(c); } return true; };
  while (i < t.length) {
    const c = t[i];
    if (c === '/' && t[i + 1] === '/') { const nl = t.indexOf('\n', i); const e = nl < 0 ? t.length : nl; out += ' '.repeat(e - i); i = e; continue; }
    if (c === '/' && t[i + 1] === '*') { const e0 = t.indexOf('*/', i + 2); const e = e0 < 0 ? t.length : e0 + 2; out += t.slice(i, e).replace(/[^\n]/g, ' '); i = e; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; let j = i + 1; while (j < t.length) { if (t[j] === '\\') { j += 2; continue; } if (t[j] === q) { j++; break; } j++; } out += q + t.slice(i + 1, j - 1).replace(/[^\n]/g, ' ') + q; i = j; continue; }
    if (c === '/' && regexPos(i)) { let j = i + 1, cls = false; while (j < t.length) { if (t[j] === '\\') { j += 2; continue; } if (t[j] === '[') cls = true; else if (t[j] === ']') cls = false; else if (t[j] === '/' && !cls) { j++; break; } else if (t[j] === '\n') break; j++; } out += ' '.repeat(j - i); i = j; continue; }
    out += c; i++;
  }
  return out;
}

const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : e.name.endsWith('.js') && files.push(p); } })(DIR);

const mods = new Map();
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripCode(raw);
  const imports = [];
  for (const m of code.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gm)) {
    const names = m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    imports.push({ names, from: m[2] });
  }
  for (const m of code.matchAll(/^import\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/gm)) {
    imports.push({ names: [m[1]], from: m[2], default: true });
  }
  const exports = new Set();
  for (const m of code.matchAll(/^export\s*\{([^}]*)\}/gm)) m[1].split(',').forEach((x) => { const n = x.trim().split(/\s+as\s+/).pop(); if (n) exports.add(n); });
  for (const m of code.matchAll(/^export\s+(?:function|class)\s+([A-Za-z_$][\w$]*)/gm)) exports.add(m[1]);
  for (const m of code.matchAll(/^export\s+(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) exports.add(m[1]);
  mods.set(file, { raw, code, imports, exports });
}

const problems = [];
const rel = (f) => path.relative(ROOT, f);

for (const [file, m] of mods) {
  const imported = new Set(m.imports.flatMap((i) => i.names));

  /* 1. 导入的名字对方有没有导出 */
  for (const imp of m.imports) {
    if (!imp.from.startsWith('.')) continue;
    let target = path.resolve(path.dirname(file), imp.from);
    if (!fs.existsSync(target)) { problems.push(`${rel(file)}: 找不到 ${imp.from}`); continue; }
    if (!target.endsWith('.js')) continue;
    const tm = mods.get(target);
    if (!tm) continue;
    if (imp.default) continue;
    for (const n of imp.names) {
      if (!tm.exports.has(n)) problems.push(`${rel(file)}: 从 ${imp.from} 导入了 ${n}，但那边没有导出它`);
    }
  }

  /* 2. 有没有对 import 绑定赋值 */
  for (const n of imported) {
    const re = new RegExp('(?<![.\\w$])' + n.replace(/\$/g, '\\$') + '\\s*(?:=(?![=>])|\\+\\+|--|\\+=|-=|\\*=)', 'g');
    const body = m.code.split('\n').filter((l) => !/^import\s/.test(l)).join('\n');
    let mm;
    while ((mm = re.exec(body))) {
      /* 函数内 var input=... 这种局部声明会遮蔽同名 import，是合法的，跳过 */
      const head = body.slice(Math.max(0, mm.index - 200), mm.index);
      if (/(?:^|[;{}()\n,])\s*(?:var|let|const)\s[^;{}()\n]*$/.test(head)) continue;
      problems.push(`${rel(file)}: 给 import 进来的 ${n} 赋值了（import 绑定只读，需要在定义它的模块里加 setter）`);
      break;
    }
  }
}

/* 3. 用了却没 import 的跨模块符号 */
const ownerOf = new Map();
for (const [file, m] of mods) for (const n of m.exports) if (!ownerOf.has(n)) ownerOf.set(n, file);
for (const [file, m] of mods) {
  const body = m.code.split('\n').filter((l) => !/^(?:import|export)\s/.test(l)).join('\n');
  const declared = new Set();
  for (const mm of body.matchAll(/(?:var|let|const|function|class)\s+([A-Za-z_$][\w$]*)/g)) declared.add(mm[1]);
  for (const mm of body.matchAll(/function\s*[A-Za-z_$\w$]*\s*\(([^)]*)\)/g)) mm[1].split(',').forEach((p) => { const n = p.trim().match(/^([A-Za-z_$][\w$]*)/); if (n) declared.add(n[1]); });
  for (const mm of body.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)) declared.add(mm[1]);
  const imported = new Set(m.imports.flatMap((i) => i.names));
  for (const [n, home] of ownerOf) {
    if (home === file || declared.has(n) || imported.has(n)) continue;
    const re = new RegExp('(?<![.\\w$])' + n.replace(/\$/g, '\\$') + '(?![\\w$])');
    if (re.test(body)) problems.push(`${rel(file)}: 用到了 ${n}，但没 import（它定义在 ${rel(home)}）`);
  }
}

if (problems.length) { console.error(`模块自检未通过，${problems.length} 个问题：\n`); problems.forEach((p) => console.error('  ✗ ' + p)); process.exit(1); }
console.log(`模块自检通过：${mods.size} 个文件，import / export 一致，没有对只读绑定赋值。`);
