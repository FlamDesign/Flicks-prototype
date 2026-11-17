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

Why: the variations are separate generations, not one render with a swap. At the same instant
they differ in pose, framing and scale (see `frame-6s-row.png`): luma PSNR between v1 and v2 at
the same frame is 17.5 dB, against 28.7 dB between two consecutive frames of v1. Temporal
prediction inside a variation is far better than prediction across variations, so joint coding
can't help, with any codec, until generation produces pixel-aligned variations.

## What this means

- No compression gain is available from joint encoding of today's generated variations.
- A switch under 10 ms needs every variation decoded in parallel (the current player does this).
  The levers are per-file: bitrate and resolution for the slot, keyframe interval, `faststart`,
  and loading order (active first, others while it plays).
- Joint coding becomes worth revisiting only when the generator keeps the base render and swaps
  a region (then even a base + per-variation overlay, no mask needed from the model: the diff is
  the mask).
