#!/usr/bin/env bash
# Measures whether joint (interleaved) encoding of a Flick's variations beats encoding them apart.
#   research/compress/measure.sh [out-dir]     (needs ffmpeg with libx264)
# Encodes the og/ clips at delivery settings (720p, 24 fps, no audio, CRF 24) three ways:
#   sep-N.mp4         each variation on its own (what the player loads today)
#   concat-x264.mp4   the four in a row, one stream (control: same encoder settings, no cross-variation prediction possible)
#   inter-x264.mp4    frames interleaved v1·f1, v2·f1, v3·f1, v4·f1, v1·f2 … at 96 fps, 8 reference frames
# If cross-variation prediction helps, inter comes out smaller than concat.
set -euo pipefail
cd "$(dirname "$0")"
out=${1:-out}; mkdir -p "$out"
in=(og/video-1.mp4 og/video-2.mp4 og/video-3.mp4 og/video-4.mp4)
for i in 1 2 3 4; do ffmpeg -v error -y -i "og/video-$i.mp4" -an -vf scale=1280:720 -c:v libx264 -preset slow -crf 24 -g 24 -refs 4 -bf 3 -pix_fmt yuv420p -movflags +faststart "$out/sep-$i.mp4"; done
S="[0:v]scale=1280:720[a];[1:v]scale=1280:720[b];[2:v]scale=1280:720[c];[3:v]scale=1280:720[d]"
ffmpeg -v error -y -i "${in[0]}" -i "${in[1]}" -i "${in[2]}" -i "${in[3]}" -an -filter_complex "$S;[a][b][c][d]concat=n=4:v=1:a=0,setpts=N/96/TB" -r 96 -c:v libx264 -preset slow -crf 24 -g 96 -refs 8 -bf 0 -pix_fmt yuv420p "$out/concat-x264.mp4"
I="[0:v]scale=1280:720,setpts=N*4/96/TB[a];[1:v]scale=1280:720,setpts=(N*4+1)/96/TB[b];[2:v]scale=1280:720,setpts=(N*4+2)/96/TB[c];[3:v]scale=1280:720,setpts=(N*4+3)/96/TB[d];[a][b][c][d]interleave=n=4,setpts=N/96/TB"
ffmpeg -v error -y -i "${in[0]}" -i "${in[1]}" -i "${in[2]}" -i "${in[3]}" -an -filter_complex "$I" -r 96 -c:v libx264 -preset slow -crf 24 -g 96 -refs 8 -bf 0 -pix_fmt yuv420p "$out/inter-x264.mp4"
echo "separate total: $(cat "$out"/sep-*.mp4 | wc -c)"
for f in concat-x264 inter-x264; do echo "$f: $(wc -c < "$out/$f.mp4")"; done
# how alike the variations are: same instant across two variations, against one frame apart in one
ffmpeg -i "$out/sep-1.mp4" -i "$out/sep-2.mp4" -lavfi "[0:v][1:v]psnr" -f null - 2>&1 | grep -o "PSNR.*" | sed 's/^/v1 vs v2, same frame: /'
ffmpeg -i "$out/sep-1.mp4" -i "$out/sep-1.mp4" -lavfi "[1:v]setpts=PTS+1/24/TB[d];[0:v][d]psnr" -f null - 2>&1 | grep -o "PSNR.*" | sed 's/^/v1, one frame apart:  /'
