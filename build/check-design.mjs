#!/usr/bin/env node
/* DESIGN.md 与 tokens.css 的一致性自检。两件事：
   1. 色值表里写的「当前值」和 tokens.css 一致（改了令牌忘了改文档，代理就会抄旧值）
   2. 正文里引用的 --令牌 在 tokens.css 里确实存在（组件索引一节是 BEM 类名修饰符，跳过）
   npm run check 跑它。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const tokens = new Map();
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) tokens.set(m[1], m[2]);

/* #fff → #ffffff，去空格、转小写，避免写法差异误报 */
const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, '').replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
/* --asset-source-{a,b}-{c,d} 展开成具体令牌名 */
const expand = (s) => { const m = s.match(/\{([^}]+)\}/); return m ? m[1].split(',').flatMap((x) => expand(s.replace(m[0], x.trim()))) : [s]; };

const problems = [];
const body = doc.replace(/^## 组件索引[\s\S]*?(?=^## )/m, '');

/* 1. 表格行：| 角色 | `--a` / `--b` | `v1` / `v2` | ... */
let rows = 0;
for (const line of body.split('\n')) {
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length < 5) continue;
  const names = [...cells[2].matchAll(/`(--[\w-]+)`/g)].map((m) => m[1]);
  const values = [...cells[3].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  if (!names.length || names.length !== values.length) continue;
  rows++;
  names.forEach((n, i) => {
    if (!tokens.has(n)) return;
    if (norm(tokens.get(n)) !== norm(values[i])) problems.push(`${n}：DESIGN.md 写的是 ${values[i]}，tokens.css 是 ${tokens.get(n).trim()}`);
  });
}

/* 2. 引用的令牌必须存在 */
const refs = new Set();
for (const m of body.matchAll(/`([^`\n]*--[^`\n]*)`/g)) for (const t of m[1].match(/--[a-z][\w{},-]*/g) || []) expand(t.replace(/[,-]+$/, '')).forEach((x) => refs.add(x));
for (const n of refs) if (!tokens.has(n)) problems.push(`DESIGN.md 引用了 ${n}，但 tokens.css 里没有`);

if (problems.length) { console.error(`设计规范自检未通过，${problems.length} 个问题：\n`); problems.forEach((p) => console.error('  ✗ ' + p)); process.exit(1); }
console.log(`设计规范自检通过：${rows} 行色值表、${refs.size} 个令牌引用与 tokens.css 一致。`);
