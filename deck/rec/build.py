import json, os, subprocess, sys
SK='/Users/liangpingxian/Downloads/1005/video-production-skill/video-production'
w, out = sys.argv[1], sys.argv[2]
m=json.load(open(f'm{w}/marks.json')); total=m['total']
run=lambda *a: subprocess.run(list(a),check=True)
names=sorted(f for f in os.listdir('.') if f.startswith(f'tts{w}_'))
assert len(names)==len(m['marks'])
ins=[]; fl=[]
for i,f in enumerate(names):
    ins+=['-i',f]; d=int(m['marks'][i]*1000); fl.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={d}|{d}[v{i}]')
n=len(names)
ins+=['-stream_loop','-1','-i',f'{SK}/assets/Wellspring.mp3']
fl.append(''.join(f'[v{i}]' for i in range(n))+f'amix=inputs={n}:normalize=0,volume=1.25[voice]')
fl.append(f'[{n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{total:.2f},volume=0.11,afade=t=in:st=0:d=1.0,afade=t=out:st={total-2.5:.2f}:d=2.5[bgm]')
fl.append('[voice][bgm]amix=inputs=2:normalize=0,alimiter=limit=0.95,atrim=0:%.2f[aout]'%total)
run('ffmpeg','-v','error','-y',*ins,'-filter_complex',';'.join(fl),'-map','[aout]','-ac','2','-ar','48000','-c:a','aac','-b:a','192k',f'{w}_mix.m4a')
run('ffmpeg','-v','error','-y','-i',f'm{w}/master.mp4','-i',f'{w}_mix.m4a','-map','0:v','-map','1:a','-t',f'{total:.2f}',
    '-vf',f'fade=t=in:st=0:d=0.3,fade=t=out:st={total-0.6:.2f}:d=0.6','-c:v','libx264','-crf','14','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-c:a','copy',out)
for i,f in enumerate(names): print(f, m['marks'][i], round(m['marks'][i]+float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f])),2))
print('total', round(total,2))
