#!/usr/bin/env bash
# Собирает ролик из ishodniki/ заново: bash build.sh  (нужен ffmpeg)
set -e; cd "$(dirname "$0")"; mkdir -p tmp; : > tmp/list.txt
# файл | начало, с | длина исходника, с | ускорение
while read f ss d sp; do
  [ -z "$f" ] && continue; n=$(basename "$f" .mp4)-$ss
  h=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "ishodniki/$f")
  if [ "$h" -lt 1000 ]; then sh=0.8; else sh=0.4; fi
  ffmpeg -v error -y -ss $ss -t $d -i "ishodniki/$f" -an \
    -vf "setpts=PTS/$sp,scale=-2:1920:flags=lanczos,crop=1080:1920,unsharp=5:5:$sh:5:5:0,fps=30,format=yuv420p" \
    -c:v libx264 -crf 14 -preset slow "tmp/$n.mp4" < /dev/null
  echo "file '$n.mp4'" >> tmp/list.txt
done <<'LIST'
01-kanaty.mp4        0   5.04 1.0
02-tumba.mp4         0   5.09 1.0
03-stoyka.mp4        0   3.95 1.0
05-reformer.mp4      0   4.0  1.12
06-kepka-tyaga.mp4   0   4.3  1.0
07-shpagat.mp4       0   5.4  1.2
08-girya.mp4         0   3.9  1.0
09-step-podrugi.mp4  3.0 4.1  1.0
10-final-palec.mp4   0   2.2  1.1
10-final-palec.mp4   5.3 2.1  1.0
LIST
ffmpeg -v error -y -f concat -safe 0 -i tmp/list.txt -c:v libx264 -crf 16 -preset slow -r 30 -pix_fmt yuv420p -movflags +faststart rolik-HQ.mp4
echo "Готово: rolik-HQ.mp4"
