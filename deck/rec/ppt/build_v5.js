// 灵基汇报 · CIO 与 Build（v5：6.1 / 6.2 换 v5 视频与要点）
// 页面框架取自《应用开发蓝图_L2》第 1 页：左上标题 + 灰色副标题、右上金蝶 logo、右下密级与页码。
// 坐标沿用 HTML 的 1600×900 像素，换算到 13.333"×7.5"。
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { applyTheme } = require(process.env.SKILL + '/scripts/apply_theme.js');

const P = __dirname;
const DECK = '/Users/liangpingxian/工作/Code/lingee/deck/汇报v5';
const OUT = process.env.OUT || path.join(DECK, '灵基汇报-CIO与Build-v5.pptx');
const D = JSON.parse(fs.readFileSync(path.join(P, 'deck_v5.json'), 'utf8'));

const px = v => v / 120;               // 像素 → 英寸
const pt = v => +(v * 0.6).toFixed(1); // 像素字号 → 磅
const emu = v => v / 914400;           // 模板 EMU → 英寸
const FONT = process.env.FONT || '微软雅黑';

const THEME = {
  name: 'Lingee Report', headFontFace: FONT, bodyFontFace: FONT,
  colors: {
    dk1: '1F2937', lt1: 'FFFFFF', dk2: '373838', lt2: 'EAF2FE',
    accent1: '2971EB', accent2: '0A8A4A', accent3: 'E6F6EE', accent4: 'DBE5F6',
    accent5: '4B5563', accent6: 'BFBFBF', hlink: '2971EB', folHlink: '0B2A5B',
  },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = '灵基汇报 · CIO 与 Build';
const C = pres.SchemeColor;
const BLUE = C.accent1, TITLE = C.text2, INK = C.text1, INK2 = C.accent5, GRAY = C.accent6;
const BLUE_SOFT = C.background2, GREEN = C.accent2, GREEN_SOFT = C.accent3, CARD_LINE = C.accent4;
const LINE = 'E3E8F2';

pres.defineSlideMaster({
  title: 'Lingee Content',
  background: { color: C.background1 },
  objects: [
    { image: { path: path.join(P, 'kd_logo.png'), x: emu(11201400), y: emu(170993), w: emu(776326), h: emu(395935) } },
    { text: { text: '④ 内部公开 请勿外传', options: { x: emu(10383012), y: emu(6416345), w: emu(1213409), h: emu(173736), fontSize: 8, color: GRAY, align: 'right', valign: 'middle', margin: 0, isTextBox: true } } },
    { placeholder: { options: { name: 'title', type: 'title', x: emu(320040), y: emu(91440), w: px(1340), h: emu(457200), fontSize: 24, bold: true, color: TITLE, align: 'left', valign: 'middle', margin: 0, fontFace: FONT }, text: '' } },
    { placeholder: { options: { name: 'subtitle', type: 'body', x: emu(320040), y: emu(502920), w: px(1340), h: emu(256032), fontSize: 12, color: GRAY, align: 'left', valign: 'middle', margin: 0, fontFace: FONT }, text: '' } },
  ],
  slideNumber: { x: emu(11745468), y: emu(6447434), w: emu(351130), h: emu(137160), fontSize: 10, color: BLUE, align: 'right', margin: 0, fontFace: FONT },
});

const X0 = 42;            // 左边距，与模板标题左缘对齐（320040 EMU ≈ 42px）
const CW = 1600 - X0 * 2; // 内容宽度
const shadow = () => ({ type: 'outer', color: '0F172A', opacity: 0.12, blur: 10, offset: 4, angle: 90 });
// 标签宽度按文字估算：中文按字号宽，其余按半宽
const textW = (t, size) => [...t].reduce((a, ch) => a + (/[⺀-￿]/.test(ch) ? size : size * 0.55), 0);

// 底框与文字分开放，文字零边距、垂直居中，避免内边距带来的偏移
function pill(s, text, { x, y, w, h, fill, color, size, radius, name }) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px(x), y: px(y), w: px(w), h: px(h), rectRadius: px(radius), fill: { color: fill }, line: { type: 'none' }, objectName: name });
  s.addText(text, { x: px(x + 14), y: px(y), w: px(w - 28), h: px(h), fontSize: pt(size), bold: true, color, margin: 0, valign: 'middle', fit: 'none', isTextBox: true });
}

function head(s, d) {
  s.addText(d.h1, { placeholder: 'title' });
  s.addText(d.product, { placeholder: 'subtitle' });
  s.addNotes(d.notes);
}

function rows(s, d) {
  let y = 112;
  d.rows.forEach(([k, v]) => {
    s.addText(k, { x: px(X0), y: px(y), w: px(96), h: px(32), fontSize: pt(18), bold: true, color: BLUE, margin: 0, valign: 'middle', isTextBox: true });
    s.addShape(pres.shapes.LINE, { x: px(X0 + 100), y: px(y + 7), w: 0, h: px(18), line: { color: LINE, width: 1.5 } });
    s.addText(v, { x: px(X0 + 116), y: px(y), w: px(CW - 116), h: px(32), fontSize: pt(19), color: INK2, margin: 0, valign: 'middle', isTextBox: true });
    y += 38;
  });
  s.addShape(pres.shapes.LINE, { x: px(X0), y: px(y + 8), w: px(CW), h: 0, line: { color: LINE, width: 0.75 } });
}

let shotNo = 0;
function cards(s, d) {
  const top = 212, gap = 28, w = (CW - gap * 2) / 3, h = 604, pad = 24, iw = w - pad * 2;
  d.cards.forEach((c, i) => {
    shotNo += 1;
    const x = X0 + i * (w + gap), cx = x + pad;
    const fg = c.g ? GREEN : BLUE, bg = c.g ? GREEN_SOFT : BLUE_SOFT;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px(x), y: px(top), w: px(w), h: px(h), rectRadius: px(30), fill: { color: 'FBFCFF' }, line: { color: CARD_LINE, width: 1.1 }, objectName: `card-${i + 1}` });
    pill(s, c.tag, { x: cx, y: top + 24, w: textW(c.tag, 15) + 28, h: 32, fill: bg, color: fg, size: 15, radius: 8, name: `card-${i + 1}-tag` });
    s.addText(c.h3, { x: px(cx), y: px(top + 70), w: px(iw), h: px(42), fontSize: pt(27), bold: true, color: '111111', margin: 0, valign: 'middle', isTextBox: true });
    s.addText(c.p.replace(/\n/g, ''), { x: px(cx), y: px(top + 116), w: px(iw), h: px(56), fontSize: pt(16), color: INK2, margin: 0, valign: 'top', lineSpacingMultiple: 1.15, isTextBox: true });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px(cx), y: px(top + 182), w: px(iw), h: px(310), rectRadius: px(14), fill: { color: 'FFFFFF' }, line: { color: LINE, width: 0.75 }, shadow: shadow() });
    s.addImage({ path: path.join(P, `crop${shotNo}.png`), x: px(cx + 1), y: px(top + 183), w: px(iw - 2), h: px(308), altText: c.alt, objectName: `card-${i + 1}-shot` });
    pill(s, c.value, { x: cx, y: top + h - pad - 50, w: iw, h: 50, fill: bg, color: fg, size: 15, radius: 12, name: `card-${i + 1}-value` });
  });
}

// 视频框：深色圆角底 + 嵌入视频（封面取第 1 秒）
function video(s, d, posterNo) {
  const w = 1248, h = 702, x = (1600 - w) / 2, y = 112;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px(x), y: px(y), w: px(w), h: px(h), rectRadius: px(16), fill: { color: '0B1220' }, line: { type: 'none' }, shadow: shadow() });
  const cover = fs.readFileSync(path.join(P, `poster_v2_${posterNo}.png`)).toString('base64');
  s.addMedia({ type: 'video', path: path.join(DECK, d.video), cover: 'image/png;base64,' + cover, x: px(x), y: px(y), w: px(w), h: px(h), objectName: 'demo-video' });
}

pres.addSection({ title: '灵基 Manage for CIO' });

// 1. CIO 三项核心议题
{
  const d = D[0];
  const s = pres.addSlide({ masterName: 'Lingee Content', sectionTitle: '灵基 Manage for CIO' });
  head(s, d);
  s.addText(d.lead, { x: px(X0), y: px(112), w: px(CW), h: px(36), fontSize: pt(22), color: INK2, margin: 0, valign: 'middle', isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: px(X0), y: px(162), w: px(CW), h: 0, line: { color: LINE, width: 0.75 } });
  let y = 196; const rh = 180, gap = 32;
  d.issues.forEach(([key, no, nm, small, ds, tail]) => {
    const k = !!key;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px(X0), y: px(y), w: px(CW), h: px(rh), rectRadius: px(28), fill: { color: k ? 'EAF2FE' : 'FBFCFF' }, line: { color: k ? 'C3D7FA' : 'DBE5F6', width: 1.1 }, objectName: `issue-${no}` });
    s.addText(no, { x: px(X0 + 36), y: px(y), w: px(60), h: px(rh), fontSize: pt(28), bold: true, color: BLUE, margin: 0, valign: 'middle', isTextBox: true });
    s.addText([
      { text: nm, options: { fontSize: pt(40), bold: true, color: TITLE, breakLine: true } },
      { text: small, options: { fontSize: pt(18), color: INK2 } },
    ], { x: px(X0 + 104), y: px(y), w: px(470), h: px(rh), margin: 0, valign: 'middle', paraSpaceBefore: 4, isTextBox: true });
    s.addText('→', { x: px(X0 + 590), y: px(y), w: px(48), h: px(rh), fontSize: pt(30), color: BLUE, align: 'center', margin: 0, valign: 'middle', isTextBox: true });
    s.addText([
      { text: ds, options: { color: INK } },
      { text: tail, options: { color: BLUE, bold: true } },
    ], { x: px(X0 + 656), y: px(y), w: px(CW - 656 - 30), h: px(rh), fontSize: pt(23), margin: 0, valign: 'middle', fit: 'none', isTextBox: true });
    y += rh + gap;
  });
}

// 2. CIO 视频
{
  const s = pres.addSlide({ masterName: 'Lingee Content', sectionTitle: '灵基 Manage for CIO' });
  head(s, D[1]);
  video(s, D[1], 1);
}

pres.addSection({ title: '灵基 Build' });
/* 6.1 / 6.2：标题 + 客户价值一行 + 左侧视频 + 右侧三张要点卡 */
[[2, 2], [3, 3]].forEach(([i, posterNo]) => {
  const d = D[i];
  const s = pres.addSlide({ masterName: 'Lingee Content', sectionTitle: '灵基 Build' });
  head(s, d);
  pill(s, '客户价值', { x: X0, y: 112, w: 100, h: 32, fill: BLUE_SOFT, color: BLUE, size: 15, radius: 8, name: 'value-label' });
  s.addText(d.value, { x: px(X0 + 116), y: px(112), w: px(CW - 116), h: px(32), fontSize: pt(19), color: INK2, margin: 0, valign: 'middle', isTextBox: true });
  const top = 166, vw = 1088, vh = 612;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px(X0), y: px(top), w: px(vw), h: px(vh), rectRadius: px(16), fill: { color: '0B1220' }, line: { type: 'none' }, shadow: shadow() });
  const cover = fs.readFileSync(path.join(P, `poster_v5_${posterNo}.png`)).toString('base64');
  s.addMedia({ type: 'video', path: path.join(DECK, d.video), cover: 'image/png;base64,' + cover, x: px(X0), y: px(top), w: px(vw), h: px(vh), objectName: 'demo-video' });
  const cx = X0 + vw + 24, cw = CW - vw - 24;
  s.addText(d.valsHead, { x: px(cx), y: px(top), w: px(cw), h: px(30), fontSize: pt(16), bold: true, color: BLUE, margin: 0, valign: 'middle', isTextBox: true });
  const ct = top + 42, gap = 16, ch = (vh - 42 - gap * 2) / 3;
  d.vals.forEach(([t, desc], k) => {
    const y = ct + k * (ch + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px(cx), y: px(y), w: px(cw), h: px(ch), rectRadius: px(20), fill: { color: 'FBFCFF' }, line: { color: CARD_LINE, width: 1.1 }, objectName: `value-${k + 1}` });
    s.addText([
      { text: t, options: { fontSize: pt(26), bold: true, color: TITLE, breakLine: true } },
      { text: desc, options: { fontSize: pt(desc.length > 34 ? 15.5 : 17), color: INK2 } },
    ], { x: px(cx + 22), y: px(y), w: px(cw - 44), h: px(ch), margin: 0, valign: 'middle', paraSpaceBefore: 6, isTextBox: true });
  });
});

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  // 中文字体：主题的 ea / 简体中文字体设成同一字体，文字语言标为 zh-CN
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync(OUT));
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/(theme\/theme\d+|slides\/slide\d+|slideLayouts\/slideLayout\d+|slideMasters\/slideMaster\d+|notesSlides\/notesSlide\d+)\.xml$/.test(name)) continue;
    let x = await zip.file(name).async('string');
    if (name.includes('theme')) x = x.replace(/<a:ea typeface=""\/>/g, `<a:ea typeface="${FONT}"/>`).replace(/<a:font script="Hans" typeface="[^"]*"\/>/g, `<a:font script="Hans" typeface="${FONT}"/>`);
    else x = x.replace(/lang="en-US"/g, 'lang="zh-CN"');
    /* 备注：每行拆成独立段落，「【版本…】」行加粗，空行保留为空段落 */
    if (name.includes('notesSlides')) x = x.replace(/<a:p><a:r>(<a:rPr[^>]*\/>)<a:t>([^<]*\n[^<]*)<\/a:t><\/a:r>/, (all, rpr, text) =>
      text.split('\n').map((line, k, arr) => {
        const bold = /^【/.test(line) ? rpr.replace('<a:rPr ', '<a:rPr b="1" ') : rpr;
        const body = line ? `<a:r>${bold}<a:t>${line}</a:t></a:r>` : `<a:endParaRPr lang="zh-CN" dirty="0"/>`;
        return k < arr.length - 1 ? `<a:p>${body}</a:p>` : `<a:p>${body}`;
      }).join(''));
    zip.file(name, x);
  }
  fs.writeFileSync(OUT, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('written', OUT);
})();
