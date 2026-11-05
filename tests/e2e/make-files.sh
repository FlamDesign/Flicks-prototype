#!/usr/bin/env bash
# Test files for the end-to-end chats: WebM copies of the recipe clips (headless Chromium can't play
# MP4) and two product stills. Run from the repo root: bash tests/e2e/make-files.sh
set -e
out=tests/e2e/files
mkdir -p "$out"
for x in product-swap/a clips-to-flick/a clips-to-flick/b clips-to-flick/c; do
  ffmpeg -loglevel error -y -i "public/recipes/$x.mp4" -c:v libvpx-vp9 -b:v 300k -an "$out/$(echo $x | tr / -).webm"
done
cp public/recipes/product-swap/a.jpg "$out/sneaker.jpg"
cp public/recipes/make-it-move/still.jpg "$out/perfume.jpg"
