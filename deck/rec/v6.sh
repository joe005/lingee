#!/bin/zsh
# 汇报 v6 · 6.2 视频（无配音、无背景音乐）与 PPT / HTML / 逐字稿重建
# 用法：先 npm run build，并在 dist/ 下起 127.0.0.1:8765 静态服务；然后 zsh deck/rec/v6.sh <工作目录>
set -e
W=${1:?工作目录}; R=${0:A:h}; DECK=$R/../汇报v6
SK=/Users/liangpingxian/Downloads/1005/video-production-skill/video-production
mkdir -p $W/kb $DECK; cd $W
# 知识页上传用的示例附件（内容不读取，只看文件名和大小）
head -c 186000 /dev/urandom > "kb/承运商运价表.xlsx"
head -c 98000 /dev/urandom > "kb/催收函模板（HR-6）.docx"
head -c 243000 /dev/urandom > "kb/网页报告模板（订单·比价·履约·收款·月报）.docx"
# 没有配音：每段最短时长用静音占位，master.mjs 按它推进画面
i=0; for d in 5 12 15 6 6 8 14 7 4; do ffmpeg -v error -y -f lavfi -i anullsrc=r=48000:cl=mono -t $d -c:a libmp3lame tts62v6_$(printf %02d $i).mp3; i=$((i+1)); done
V6_KB_DIR=$W/kb node $R/master.mjs 62v6
T=$(python3 -c "import json;print(json.load(open('m62v6/marks.json'))['total'])"); FO=$(python3 -c "print(round($T-0.7,2))")
python3 $SK/scripts/render_bilingual_subtitles.py --srt $DECK/6.2-字幕.srt --video m62v6/master.mp4 --out-dir subs --concat subs.ffconcat \
  --width 2560 --height 1440 --duration $T --zh-size 52 --en-size 36 --bottom 70 --max-width 2100 --outline 5
ffmpeg -v error -y -f concat -safe 0 -i subs.ffconcat -vf fps=30,format=rgba -c:v qtrle subs.mov
ffmpeg -v error -y -i m62v6/master.mp4 -an -t $T -vf "fade=t=in:st=0:d=0.3,fade=t=out:st=$FO:d=0.6" -c:v libx264 -crf 14 -preset medium -pix_fmt yuv420p -movflags +faststart "$DECK/6.2-Build让企业全员都能构建自己的智能体.mp4"
ffmpeg -v error -y -i m62v6/master.mp4 -i subs.mov -an -t $T -filter_complex "[0:v][1:v]overlay=0:0:format=auto,fade=t=in:st=0:d=0.3,fade=t=out:st=$FO:d=0.6[v]" -map "[v]" -c:v libx264 -crf 14 -preset medium -pix_fmt yuv420p -movflags +faststart "$DECK/6.2-Build让企业全员都能构建自己的智能体-带字幕.mp4"
ffmpeg -v error -y -ss 36 -i "$DECK/6.2-Build让企业全员都能构建自己的智能体.mp4" -frames:v 1 -vf scale=1600:900:flags=lanczos $R/ppt/poster_v6_3.png
python3 $R/ppt/make_v6.py $W
# 需要 pptxgenjs（NODE_PATH）和 pptx skill 的 apply_theme.js（SKILL）
node $R/ppt/build_v6.cjs
