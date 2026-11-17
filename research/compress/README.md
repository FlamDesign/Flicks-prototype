# Flick compression research

Question: can a Flick's variations be encoded together so that all of them cost much less than
loading each one, while every variation stays decoded for a switch under 10 ms?

## Material

`og/`: four generated variations of one scene (ZIFAN slip, black / ivory / pink / champagne),
1920×1080 HEVC, 24 fps, 10 s, 241 frames, ~11 MB each (8.5 Mbps, a generation master, not a
delivery encode). `thumbnail-2.jpg` is the ivory variation's thumbnail.

## Measurement (16 Nov 2026, `measure.sh`)

Delivery settings: 1280×720, 24 fps, no audio, x264 slow, CRF 24.

| encode | bytes | note |
|---|---|---|
| four separate files (keyframe every 1 s) | 3,596,673 | what the player loads today; ~0.9 MB per variation |
| four in a row, one stream (control) | 1,828,269 | same settings as the interleave, no cross-variation prediction possible |
| **interleaved** v1·f1, v2·f1, v3·f1, v4·f1 … 96 fps, 8 refs | 2,359,912 | cross-variation prediction available to the encoder |
| interleaved, with B-frames | 2,305,685 | |

The interleave is 29% **larger** than the control: the encoder gains nothing from seeing the
other variations' frames, and loses because each variation's own previous frame sits four
references back. The saving against "separate" (34%) comes only from the longer GOP (keyframe
every 4 s instead of 1 s) and more references, which the separate files could use too.

Correction (same night): that comparison used variation 1, which is the odd one out. Variations
2, 3 and 4 are swaps on one base and are pixel-aligned; 1 is a separate generation.

| pair | luma PSNR, same frame |
|---|---|
| v1 vs v2 / v3 / v4 | 17.5 / 19.1 / 18.2 dB |
| v2 vs v3, v2 vs v4, v3 vs v4 | 31.0 / 34.9 / 33.2 dB |
| one clip, consecutive frames | 28.7 dB |

So across 2, 3, 4 the other variation's frame predicts better than the clip's own previous frame,
and the difference image (`diff-v2-v3-3s.png`) is the dress alone: the mask exists in the data.

Joint encode of 2, 3, 4 only (same settings, 72 fps interleave, 8 refs):

| encode | bytes |
|---|---|
| three separate files | 2,691,067 |
| three in a row, one stream (control) | 1,568,184 |
| interleaved | 1,594,072 |

Still no byte gain, and now the reason is different: the background is a static studio, which
temporal prediction already codes for almost nothing. What costs bytes is the dress, and the dress
differs between variations, so it has to be coded per variation either way. Cross-variation
prediction only saves bytes when the shared part is expensive to code in time (moving camera,
textured or busy backgrounds) and that case isn't in this material.

## What this means

- Bytes: on studio-style content, joint coding saves nothing. On content with motion or busy
  backgrounds shared across aligned variations it should, and that needs a clip to measure.
- Decode: aligned variations make a base + delta stream possible (the "xstream" mechanism in
  `vertex-player-teardown.md`): decode the base and only the active variation's delta, 2× one
  video instead of N×, one file, instant switch at a group boundary. That is a real win for
  phones even when bytes are equal.
- Variation 1 shows the pipeline isn't always aligned: a Flick with one re-generated variation
  falls back to full coding for that variation. The bake should measure alignment (PSNR against
  the base) and choose per variation.

## Second set: same band, three backgrounds (`og-backgrounds/`, 16 Nov)

Festival, garage, boardroom: 1440×1440 HEVC, 24 fps, 8 s, 193 frames. The poses align across the
three, but the background, clothes and lighting all change (`backgrounds-3s-row.png`).

| pair | luma PSNR, same frame |
|---|---|
| festival vs garage / boardroom, garage vs boardroom | 17.3 / 13.2 / 13.9 dB |
| festival, consecutive frames | 31.7 dB |

Joint encode (720×720, x264 slow, CRF 24):

| encode | bytes |
|---|---|
| three separate files (keyframe every 1 s) | 3,895,002 |
| three in a row, one stream (control) | 1,653,031 |
| interleaved | 2,470,814 |

Interleaving costs 49% more than the control. A background swap shares only the people, and even
they are re-lit and re-dressed, so there is nothing for cross-variation prediction to use; these
three are full streams under any scheme. As with variation 1 of the first set, the bake has to
detect this (PSNR against the base) and not attempt a delta.
