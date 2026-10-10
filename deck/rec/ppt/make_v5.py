# -*- coding: utf-8 -*-
# 汇报 v5：6.1 / 6.2 换 v5 视频、新标题、新讲稿与右侧要点；CIO 两页沿用 v3
import json, html, re
SP = '/private/tmp/claude-502/-Users-liangpingxian----Code-lingee/57a6fe94-5bff-42ab-b6a8-aadc5baa78b5/scratchpad'
V3 = '/Users/liangpingxian/工作/Code/lingee/deck/汇报v3'
V5 = '/Users/liangpingxian/工作/Code/lingee/deck/汇报v5'
NAR = json.load(open('/Users/liangpingxian/工作/Code/lingee/deck/rec/narration.json', encoding='utf-8'))

def ts(t): t = int(t); return '%02d:%02d' % (t // 60, t % 60)
def marks(w): return json.load(open(SP + '/rec/m%s/marks.json' % w))
def timed(w, lines):
    m = marks(w)['marks']; assert len(m) == len(lines), (w, len(m), len(lines))
    return [(ts(t), l) for t, l in zip(m, lines)]
def dur(w): return round(marks(w)['total'])

A = '【版本一 · 现场完整讲解】视频静音播放，按时间点讲：'
B = '【版本二 · 视频自带配音】人只串场：'
VO61, VO62 = NAR['61'], NAR['62']
SAY61, SAY62 = list(VO61), list(VO62)
PRE61 = '播放前：6.1 看专业开发人员。设备巡检维修系统已在 Manage 中立项，进入 Build，真正干活的是一支苍穹应用开发智能体团队。'
POST61 = '播放后：请看右侧三点。智能体负责干活：需求、方案、开发、测试、部署各由一个智能体完成，结果自动交接；人负责目标和审核：张伟只确认目标、审核测试结果；金蝶元数据做底座：智能体操作结构化 ERP 元数据，开发更快、Token 更省，权限和业务规则继承金蝶 ERP。过去是开发人员自己干活，未来是开发人员带着一支智能体团队干活。'
PRE62 = '播放前：但智能体不应该只属于开发人员。6.2 看设备主管周师傅，他不会写代码，只有二十年的排障经验。'
POST62 = '播放后：Build 做一个智能体就三步：说出经验和要用的技能；Build 在创建助手的同时生成技能、自动绑定，经验写成工作原则；本地测试通过后经企业审核，发布给维修人员。过去只有技术人员能开发能力，未来每个员工都能把自己的经验变成智能体。懂自己的工作，就能拥有自己的智能体。'

def notes(w, say, pre, post):
    return A + '\n' + '\n'.join('[%s] %s' % x for x in timed(w, say)) + '\n\n' + B + '\n' + pre + '\n（播放视频，约 %d 秒）\n' % dur(w) + post

S61 = dict(product='灵基Build For 专业开发人员', h1='6.1 Build 让每一名开发人员都拥有自己的智能体开发团队',
           value='需求、方案、开发、测试、部署各由一个智能体完成，结果自动交接；开发人员只负责目标、审核和关键决策。',
           video='6.1-Build让每一名开发人员都拥有自己的智能体开发团队.mp4', valsHead='人与智能体团队的分工',
           vals=[['智能体负责干活', '五个阶段各由一个智能体执行 → 前一个完成，结果自动交给下一个'],
                 ['人负责目标和审核', '张伟只确认目标、审核测试结果 → 42 条用例通过后交给部署智能体上线'],
                 ['金蝶元数据做底座', '智能体读写结构化 ERP 元数据 → 开发更快、Token 更省，权限继承金蝶 ERP']])
S62 = dict(product='灵基Build For 企业全员', h1='6.2 Build 让企业全员都能构建自己的智能体',
           value='懂自己的工作，就能拥有自己的智能体：老师傅说出经验，Build 生成能查数据、能读知识的助手，经验变成全企业可复制的能力。',
           video='6.2-Build让企业全员都能构建自己的智能体.mp4', valsHead='Build 怎么做出一个智能体',
           vals=[['① 说出经验和要求', '像平时说话一样讲清楚排障经验，以及要用的两个技能'],
                 ['② Build 一起生成', '创建助手的同时生成并校验技能、自动绑定 → 经验写成工作原则，关联企业知识'],
                 ['③ 先测再发布', '本地测试先查记录再给建议 → 提交后经企业审核，发布给维修人员']])

D = json.load(open(SP + '/ppt/deck_v3.json', encoding='utf-8'))
for i, s, w, say, pre, post in ((2, S61, '61', SAY61, PRE61, POST61), (3, S62, '62', SAY62, PRE62, POST62)):
    D[i].update(s); D[i]['notes'] = notes(w, say, pre, post)
json.dump(D, open(SP + '/ppt/deck_v5.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# HTML：替换 6.1 / 6.2 两页的讲稿、标题、客户价值、视频与右侧要点
h = open(V3 + '/灵基汇报-CIO与Build-v3.html', encoding='utf-8').read()
def note_attr(n):
    body = html.escape(n, quote=False).replace('【版本一 · 现场完整讲解】', '<b>【版本一 · 现场完整讲解】</b>').replace('【版本二 · 视频自带配音】', '<b>【版本二 · 视频自带配音】</b>').replace('\n', '<br>')
    return html.escape(body, quote=True)
def vals_html(head, vals):
    return '<div class="vals"><div class="vals-head">' + html.escape(head) + '</div>' + ''.join('<div class="val"><b>%s</b><p>%s</p></div>' % (html.escape(t), html.escape(p)) for t, p in vals) + '</div>'
def slide_html(no, d, aria):
    return ('  <section class="slide" data-notes="' + note_attr(d['notes']) + '">\n'
      '    <div class="product">' + html.escape(d['product']) + '</div>\n'
      '    <div class="logo"><i><b></b><b></b><b></b><b></b></i>金蝶</div>\n'
      '    <h1>' + html.escape(d['h1']) + '</h1>\n'
      '    <div class="vrow"><b>客户价值</b><span>' + html.escape(d['value']) + '</span></div>\n'
      '    <div class="split">\n'
      '      <div class="vbox"><video src="' + html.escape(d['video']) + '" controls preload="metadata" playsinline aria-label="' + aria + '"></video></div>\n'
      '      ' + vals_html(d['valsHead'], d['vals']) + '\n'
      '    </div>\n'
      '    <div class="foot"><b>' + str(no) + '</b></div>\n'
      '  </section>\n')
secs = list(re.finditer(r'  <section class="slide[^"]*" data-notes="[^"]*">.*?</section>\n', h, flags=re.S))
assert len(secs) == 4
h = h[:secs[2].start()] + slide_html(3, D[2], '6.1 产品 Demo') + slide_html(4, D[3], '6.2 产品 Demo') + h[secs[3].end():]
h = h.replace('灵基汇报 · CIO 与 Build v3', '灵基汇报 · CIO 与 Build v5')
h = h.replace('.val p{margin:8px 0 0;font-size:16px;', '.val p{margin:8px 0 0;font-size:15px;')
open(V5 + '/灵基汇报-CIO与Build-v5.html', 'w', encoding='utf-8').write(h)

# 逐字稿：CIO 两页沿用 v3 原文，6.1 / 6.2 重写
md = open(V3 + '/灵基汇报-CIO与Build-v3-逐字稿.md', encoding='utf-8').read()
head = md[:md.index('## 第 3 页')]
head = head.replace('（v3）逐字稿', '（v5）逐字稿').replace('-v3.pptx', '-v5.pptx').replace('-v3.html', '-v5.html').replace('deck/汇报v3/', 'deck/汇报v5/')
def page(no, d, w, vo, say, pre, post):
    out = ['## 第 %d 页 · %s' % (no, d['h1']), '', '**页面文字**', '', '- ' + d['product'], '- ' + d['h1'], '- 客户价值：' + d['value'], '- %s：' % d['valsHead']]
    out += ['  - %s：%s' % (t, p) for t, p in d['vals']]
    out += ['', '**视频配音原文**（`%s`，约 %d 秒，无封面、无字幕）' % (d['video'], dur(w)), '']
    out += ['- [%s] %s' % x for x in timed(w, vo)]
    out += ['', '**讲稿 · 版本一（现场完整讲解）**', ''] + ['- [%s] %s' % x for x in timed(w, say)]
    out += ['', '**讲稿 · 版本二（视频自带配音，人只串场）**', '', '- ' + pre, '- （播放视频，约 %d 秒）' % dur(w), '- ' + post, '']
    return '\n'.join(out)
md5 = head + page(3, D[2], '61', VO61, SAY61, PRE61, POST61) + '\n---\n\n' + page(4, D[3], '62', VO62, SAY62, PRE62, POST62)
md5 += '\n---\n\n## 6.1 → 6.2 衔接\n\n- 6.1 结束：Build，让每一名开发人员，都拥有一支自己的智能体开发团队。\n- 6.2 开始：但智能体不应该只属于开发人员。\n- 6.2 落点：Build，让企业全员都能构建自己的智能体。懂自己的工作，就能拥有自己的智能体。\n'
open(V5 + '/灵基汇报-CIO与Build-v5-逐字稿.md', 'w', encoding='utf-8').write(md5)
print('ok', dur('61'), dur('62'))
