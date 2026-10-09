# -*- coding: utf-8 -*-
# 按 narration.json 逐段合成配音（微软 zh-CN-YunyangNeural，+10%），输出到当前工作目录的 tts{61|62}_NN.mp3
# 用法：cd <工作目录> && python3 <仓库>/deck/rec/tts.py 61 62
import asyncio, json, os, sys, edge_tts
L = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'narration.json'), encoding='utf-8'))
async def main(ws):
    for w in ws:
        for f in os.listdir('.'):
            if f.startswith('tts%s_' % w): os.remove(f)
        for i, t in enumerate(L[w]):
            await edge_tts.Communicate(t, 'zh-CN-YunyangNeural', rate='+10%').save('tts%s_%02d.mp3' % (w, i))
asyncio.run(main(sys.argv[1:] or ['61', '62']))
print('done')
