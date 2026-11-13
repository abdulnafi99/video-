#!/usr/bin/env bash
# Concatenate rendered segments, add soundtrack (+ optional VO in vo/vo1..5.wav), export master + 1080p.
set -euo pipefail
cd "$(dirname "$0")"
printf "file 'seg%d.mp4'\n" 0 1 2 3 > out/concat.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/concat.txt -c copy out/video.mp4
STARTS=(0.6 8.6 18.6 39.4 54.4)
AUDIO=out/soundtrack.wav
if ls vo/vo*.wav >/dev/null 2>&1; then
  inputs=(-i out/soundtrack.wav); filt=""; labels=""; n=1
  for i in 1 2 3 4 5; do
    [ -f vo/vo$i.wav ] || continue
    ms=$(python3 -c "print(int(${STARTS[$((i-1))]}*1000))")
    inputs+=(-i vo/vo$i.wav)
    filt+="[$n:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v$n];"; labels+="[v$n]"; n=$((n+1))
  done
  filt+="${labels}amix=inputs=$((n-1)):normalize=0,volume=1.6[vo];[vo]asplit[vo1][vo2];"
  filt+="[0:a][vo1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[bed];[bed][vo2]amix=inputs=2:normalize=0,alimiter=limit=0.95[out]"
  ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$filt" -map "[out]" -t 60 out/mix.wav
  AUDIO=out/mix.wav
fi
ffmpeg -y -loglevel error -i out/video.mp4 -i "$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -t 60 -movflags +faststart out/PRC-Building-60s-4K.mp4
ffmpeg -y -loglevel error -i out/PRC-Building-60s-4K.mp4 -vf scale=1920:1080:flags=lanczos -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart out/PRC-Building-60s-1080p.mp4
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact out/PRC-Building-60s-4K.mp4
