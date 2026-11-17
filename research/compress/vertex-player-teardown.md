# How the "night" demo works (native-ads-dev.appless.workers.dev/night)

Read from the served client code on 16 Nov 2026: `night/ad.js` (13.5 KB loader), `ad-webgl.4eedbd4.js`
and `ad-webgpu.4eedbd4.js` (~200 KB each, the `vertex-player` element). The media files are behind
signed URLs that only a browser fetch from the page can read, so the container is described from the
parser in the player, not from the bytes.

## Shape of the demo

- The page is 573 bytes: a `<vertex-player>` sized to the viewport and `ad.js`.
- `ad.js` holds the ad config: a `vrt` stream URL per codec (signed, expiring), an `audio` URL, a
  `skin` URL (HTML overlay), a beacon endpoint `/i`, the frame size (1920×1080), duration (10 s) and
  the file size per codec: h264 13.87 MB, vp9 13.70 MB, hevc 13.77 MB, av1 13.96 MB.
- It is built as a rich-media display ad: CTA exits go through DoubleClick Studio's `Enabler.exit`
  (or `ExitApi`), click templates carry `{POLYGON_ID}` `{SCENE_ID}` `{IS_CTA}` `{CB}`, and every
  event (codec choice, device capability, render errors, scene changes, variant changes, polygon
  clicks, speaker, interaction, CTA) is beaconed with `sendBeacon`.

## Startup (ad.js)

1. Device beacon: GPU, WebGL, cores, memory, connection type, save-data, DPR.
2. Codec choice: for each of h264 / vp9 / hevc / av1 it asks `VideoDecoder.isConfigSupported`
   (prefer-hardware) and `mediaCapabilities.decodingInfo` at the real size and bitrate, then picks
   the **smallest file among the codecs with hardware (or smooth) decode**. The answer is cached in
   localStorage per creative version. No WebCodecs and no mediaCapabilities → h264. A timeout
   falls back to h264 too.
3. Starts the `vrt` and `audio` fetches at high priority, in parallel, before the renderer bundle
   loads, and hands the in-flight responses to the player (`__vrtxStreams`).
4. Loads `ad-webgpu` when `navigator.gpu` exists, else `ad-webgl`.

## The player (vertex-player)

Own container, own decode path, own renderer. Nothing goes through `<video>` unless it must.

- **Container "VRT!"**: magic `VRT!`, a version (3, 4, 6, 7), flags (codec: h264 / vp9 / hevc /
  av1; alpha), then a JSON "graph" (scenes with start/end/loop, polygons = clickable regions per
  scene, edges with triggers `complete` / `polygon` / `swipe` and conditions on player state,
  optional `quad` or `xstream` sections), a LUT of scene → byte offset (for seeking), and in v4/v6/v7
  an "IDR bundle": a keyframe per scene kept in the header so a scene jump starts on a decoded frame
  at once. After the header: raw elementary stream. H.264/HEVC as Annex B (a WASM demuxer finds
  NALs and access units and seeks to byte offsets); VP9/AV1 as IVF frames. A plain IVF file (magic
  `DKIF`) is also accepted.
- **Decode**: WebCodecs `VideoDecoder` fed `EncodedVideoChunk`s straight from the stream (key /
  delta known from the index). Fallback: an MSE backend that wraps the same chunks into fMP4
  (`ftyp` / `moov` / `mdat` built in JS) and plays them in a hidden `<video>`. The player keeps
  a queue of decoded `VideoFrame`s and paces them itself against the audio clock (WebAudio
  `AudioContext`, the audio file decoded once), so it has frame-exact control, loops per scene, and
  can jump to a scene by its byte offset without a seek stall.
- **Render**: WebGPU → WebGL2/WebGL1 → Canvas2D. One textured quad; a `uCell` uniform picks the
  part of the decoded frame to show. Alpha video is "stitched": colour in the top half, alpha in
  the bottom half of the same frame, composited in the shader (transparent video everywhere,
  no VP9-alpha or HEVC-alpha dependence).
- **Overlay**: a pointer layer with polygon hit-testing (hover cursor, click → graph edge), and a
  "skin": an HTML fragment loaded from the `skin` URL, injected over the canvas, with
  `data-vertex-trigger` (fires a polygon edge) and `data-vertex-variant` (switches a variant)
  attributes wired by the player. The variation picker is skin HTML, not player code.

## The two variant mechanisms (what matters for Flicks)

**quad (v7)**: the variants are tiled 2×2 in one frame (2 to 4 variants, a 2 px gutter), one
stream, one decoder. A switch changes `uCell` on the next draw: no fetch, no seek, no decoder
state, under a frame. The cost is 4× pixels decoded and ~4× bytes in one file; only the one
stream is ever opened. (The stitched-alpha and xstream modes are not allowed with quad.)

**xstream (vp9 / av1 only)**: the file holds `chains` (2 to 64) interleaved per tick: chain 0 is a
full video; chains 1..N are "diff" packets, one per tick, each a non-key frame predicted from the
chain-0 frame of the same tick. The player decodes chain 0 every tick and only the active
chain's diff packet after it (timestamp +1 µs), so decode cost is 2× one video, not N×, and
the bytes for N variants are one video plus N small deltas. A switch waits for the next tick
that is a multiple of `k` (a group boundary) and then feeds the other chain's packets: no
keyframe, no seek. Chain 0 itself is variant 0. This is the base-plus-delta design, with the
codec's own inter prediction as the delta and no mask: it works when the variants are
pixel-aligned renders of one base, and degrades to large deltas when they are separate
generations (the case measured in README.md: 17.5 dB between variants at the same frame).

## What the demo most likely is

1080p, 10 s, ~13.8 MB per codec, scene graph with polygons and swipe triggers, a skin, audio:
a branching interactive film in one container, with variants switchable from the skin. Which of
quad or xstream the "night" file uses can't be told without the bytes; the sizes being equal
across codecs (which never happens for the same content at the same quality) suggest the
files were encoded to a size target rather than a quality target.

## Takeaways for our player

- Their instant switch is bought with one of the two tricks above, both of which we evaluated:
  quad is my option 1 (tiled), xstream is option 3 (base + delta) done without a mask.
- For independently generated variations (ours today) xstream gives no byte saving and quad costs
  4× decode, so their stack doesn't change the conclusion in README.md.
- Worth copying regardless: codec choice by hardware probe and smallest file; starting the media
  fetch before the player bundle; per-scene keyframes in the header for instant jumps; the skin
  as plain HTML with data attributes (our layout layer could be delivered the same way); and
  stitched alpha for transparent overlays.
