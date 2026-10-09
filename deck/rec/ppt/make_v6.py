# -*- coding: utf-8 -*-
# 汇报 v6：只换 6.2 —— 商务主管林悦用大白话搭建销售履约智能体（视频无配音、无背景音乐，另有带字幕版）；其余页面沿用 v5
# 用法：python3 make_v6.py <录屏工作目录>（读取 m62v6/marks.json），之后 NODE_PATH=... SKILL=... node build_v6.js
import json, html, re, sys
P = '/Users/liangpingxian/工作/Code/lingee/deck/rec/ppt'
V5 = '/Users/liangpingxian/工作/Code/lingee/deck/汇报v5'
V6 = '/Users/liangpingxian/工作/Code/lingee/deck/汇报v6'
M = json.load(open(sys.argv[1] + '/m62v6/marks.json'))
DUR = round(M['total'])

def ts(t): t = int(round(t)); return '%02d:%02d' % (t // 60, t % 60)

# 现场讲解按录屏分段（与 scenes62v6.mjs 的 9 段对应）
SAY = [
  '但智能体不应该只属于开发人员。商务主管林悦不会写代码，接单、履约、催款的规矩都在她心里。',
  '她在 Build 里选「智能体开发」，用大白话写需求：做一个销售履约智能体，四个技能一起做，数据从金蝶 ERP 取；再讲清规矩：先查信用，改 ERP 先存草稿，缺数据交给人，逾期 30 天才催收。',
  'Build 理解后，一次生成接单、履约、催收、月报四个技能，并通过 MCP 接上金蝶 ERP：查信用、建订单、下推发货和出库、查应收，读写都走 ERP 原有的权限。',
  '不到两分钟，属于林悦的销售履约智能体就生成了。',
  '点开看，她说的规矩变成了工作原则：改动 ERP 先存草稿，等人确认。',
  '四个技能已自动绑定，她再上传运价表、催收函和网页报告模板，作为内置知识。',
  '用一张真实的客户采购单本地测试，不碰生产数据：它先查信用，再出订单草稿和网页预览，然后停下来问是否提交审核，和林悦自己的做法一样。',
  '测试通过，提交企业审核，发布给销售团队。十年的履约经验，变成了整个团队都能用的智能体。',
  'Build，让企业全员都能构建自己的智能体。懂自己的工作，就能拥有自己的智能体。',
]
assert len(SAY) == len(M['marks'])
TIMED = [(ts(t), l) for t, l in zip(M['marks'], SAY)]
TIMED[0] = ('00:00', TIMED[0][1])
PRE = '播放前：但智能体不应该只属于开发人员。6.2 看商务主管林悦，她不会写代码，只有十年的销售履约经验。'
POST = ('播放后：Build 做一个智能体就三步：用大白话说出需求和规矩；Build 一起生成并绑定四个技能，经 MCP 接上金蝶 ERP，规矩写成工作原则；'
        '本地测试通过后经企业审核，发布给销售团队。它不只会查数据：改 ERP 先存草稿、等人确认，缺数据就转人工。懂自己的工作，就能拥有自己的智能体。')
A = '【版本一 · 现场完整讲解】视频无配音，按时间点讲：'
B = '【版本二 · 播放带字幕视频】人只串场：'
NOTES = A + '\n' + '\n'.join('[%s] %s' % x for x in TIMED) + '\n\n' + B + '\n' + PRE + '\n（播放视频，约 %d 秒，无配音、带中英字幕）\n' % DUR + POST

VIDEO = '6.2-Build让企业全员都能构建自己的智能体-带字幕.mp4'
S62 = dict(product='灵基Build For 企业全员', h1='6.2 Build 让企业全员都能构建自己的智能体',
           value='懂自己的工作，就能拥有自己的智能体：商务主管说出履约规矩，Build 生成能读写金蝶 ERP、守得住规矩的销售履约智能体。',
           video=VIDEO, valsHead='Build 怎么做出一个智能体',
           vals=[['① 说出需求和规矩', '像交代新同事一样讲清接单、履约、催收的规矩，以及要的四个技能'],
                 ['② Build 一起生成', '生成并绑定四个技能，经 MCP 接上金蝶 ERP → 规矩写成工作原则，模板上传为内置知识'],
                 ['③ 先测再发布', '真实采购单测试：先查信用、出订单草稿、停下来问人 → 经企业审核，发布给销售团队']])

D = json.load(open(P + '/deck_v5.json', encoding='utf-8'))
assert D[3]['h1'] == S62['h1']
D[3].update(S62); D[3]['notes'] = NOTES
json.dump(D, open(P + '/deck_v6.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# HTML：只替换第 4 页（6.2）
h = open(V5 + '/灵基汇报-CIO与Build-v5.html', encoding='utf-8').read()
def note_attr(n):
    body = html.escape(n, quote=False)
    for tag in ('【版本一 · 现场完整讲解】', '【版本二 · 播放带字幕视频】'): body = body.replace(tag, '<b>' + tag + '</b>')
    return html.escape(body.replace('\n', '<br>'), quote=True)
def vals_html(head, vals):
    return '<div class="vals"><div class="vals-head">' + html.escape(head) + '</div>' + ''.join('<div class="val"><b>%s</b><p>%s</p></div>' % (html.escape(t), html.escape(p)) for t, p in vals) + '</div>'
d = D[3]
slide = ('  <section class="slide" data-notes="' + note_attr(d['notes']) + '">\n'
  '    <div class="product">' + html.escape(d['product']) + '</div>\n'
  '    <div class="logo"><i><b></b><b></b><b></b><b></b></i>金蝶</div>\n'
  '    <h1>' + html.escape(d['h1']) + '</h1>\n'
  '    <div class="vrow"><b>客户价值</b><span>' + html.escape(d['value']) + '</span></div>\n'
  '    <div class="split">\n'
  '      <div class="vbox"><video src="' + html.escape(d['video']) + '" controls preload="metadata" playsinline aria-label="6.2 产品 Demo"></video></div>\n'
  '      ' + vals_html(d['valsHead'], d['vals']) + '\n'
  '    </div>\n'
  '    <div class="foot"><b>4</b></div>\n'
  '  </section>\n')
secs = list(re.finditer(r'  <section class="slide[^"]*" data-notes="[^"]*">.*?</section>\n', h, flags=re.S))
assert len(secs) == 4
h = h[:secs[3].start()] + slide + h[secs[3].end():]
assert 'CIO 与 Build v5' in h
h = h.replace('灵基汇报 · CIO 与 Build v5', '灵基汇报 · CIO 与 Build v6')
open(V6 + '/灵基汇报-CIO与Build-v6.html', 'w', encoding='utf-8').write(h)

# 逐字稿：只重写第 4 页与 6.1 → 6.2 衔接
md = open(V5 + '/灵基汇报-CIO与Build-v5-逐字稿.md', encoding='utf-8').read()
head = md[:md.index('## 第 4 页')]
head = head.replace('（v5）逐字稿', '（v6）逐字稿').replace('-v5.pptx', '-v6.pptx').replace('-v5.html', '-v6.html').replace('deck/汇报v5/', 'deck/汇报v6/')
SRT = open(V6 + '/6.2-字幕.srt', encoding='utf-8').read().strip().split('\n\n')
subs = []
for blk in SRT:
    lines = blk.split('\n'); subs.append((lines[1][3:8], lines[2]))
out = ['## 第 4 页 · ' + d['h1'], '', '**页面文字**', '', '- ' + d['product'], '- ' + d['h1'], '- 客户价值：' + d['value'], '- %s：' % d['valsHead']]
out += ['  - %s：%s' % (t, p) for t, p in d['vals']]
out += ['', '**视频**：`6.2-Build让企业全员都能构建自己的智能体.mp4`（约 %d 秒，无配音、无背景音乐）；PPT 与 HTML 嵌入带字幕版 `%s`，字幕文件 `6.2-字幕.srt`。' % (DUR, VIDEO), '',
        '**画面流程**：开发板块新会话选「智能体开发」→ 林悦用大白话写下需求和规矩 → Build 调用 skill-builder 生成四个技能，经 MCP 接上金蝶 ERP，写入角色、绑定技能、关联销售履约知识库 → 交付摘要和智能体卡片 → 配置面板看工作原则、四个技能，上传运价表、催收函模板、网页报告模板 → 本地测试附上客户采购单：信用检查、订单草稿、网页预览，停下来问是否提交审核 → 提交上架审核，企业审核通过后发布给销售团队。', '',
        '**视频字幕（中文）**', '']
out += ['- [%s] %s' % x for x in subs]
out += ['', '**讲稿 · 版本一（现场完整讲解）**', ''] + ['- [%s] %s' % x for x in TIMED]
out += ['', '**讲稿 · 版本二（播放带字幕视频，人只串场）**', '', '- ' + PRE, '- （播放视频，约 %d 秒，无配音、带中英字幕）' % DUR, '- ' + POST, '']
md6 = head + '\n'.join(out) + '\n---\n\n## 6.1 → 6.2 衔接\n\n- 6.1 结束：Build，让每一名开发人员，都拥有一支自己的智能体开发团队。\n- 6.2 开始：但智能体不应该只属于开发人员。\n- 6.2 落点：Build，让企业全员都能构建自己的智能体。懂自己的工作，就能拥有自己的智能体。\n'
open(V6 + '/灵基汇报-CIO与Build-v6-逐字稿.md', 'w', encoding='utf-8').write(md6)
print('ok', DUR)
