/**
 * Do two videos move the same way? A Flick switches variations with an instant cut at the same
 * moment of every video, so the camera and the subject must do the same thing at the same time in
 * all of them; what's in the frame (product, place, colours) may differ.
 *
 * Read from the frames, in the browser: each video is sampled at the same moments, drawn small and
 * in grey, and for each step between samples two things are measured: how far the whole picture
 * shifted (the camera), and where in the frame things changed (the subject), on a coarse grid.
 * Two videos match when those agree step by step. Colours and backgrounds don't enter into it.
 */

const W = 48
const H = 48
const STEPS = 10
const GRID = 4
const REACH = 5

export type Motion = {
  /** per step: the whole picture's shift, in small-frame pixels */
  shift: [number, number][]
  /** per step: how much changed in each grid cell, as a share of the frame's contrast */
  cells: number[][]
  /** per step: how much changed overall */
  energy: number[]
}

/** grey, small, contrast-normalised: so a dark video and a bright one compare alike */
function grey(data: Uint8ClampedArray): Float32Array {
  const g = new Float32Array(W * H)
  let sum = 0
  for (let i = 0; i < W * H; i++) {
    g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    sum += g[i]
  }
  const mean = sum / (W * H)
  let dev = 0
  for (let i = 0; i < W * H; i++) dev += (g[i] - mean) ** 2
  const sd = Math.sqrt(dev / (W * H)) || 1
  for (let i = 0; i < W * H; i++) g[i] = (g[i] - mean) / sd
  return g
}

/** mean difference between a and b moved by (dx, dy), over the part where both exist */
function diffAt(a: Float32Array, b: Float32Array, dx: number, dy: number): number {
  let sum = 0
  let n = 0
  for (let y = REACH; y < H - REACH; y++)
    for (let x = REACH; x < W - REACH; x++) {
      sum += Math.abs(a[y * W + x] - b[(y + dy) * W + x + dx])
      n++
    }
  return sum / n
}

/** the motion between each pair of neighbouring frames */
export function motionOf(frames: Uint8ClampedArray[]): Motion {
  const g = frames.map(grey)
  const out: Motion = { shift: [], cells: [], energy: [] }
  for (let i = 0; i + 1 < g.length; i++) {
    const a = g[i]
    const b = g[i + 1]
    let best = Infinity
    let at: [number, number] = [0, 0]
    for (let dy = -REACH; dy <= REACH; dy++)
      for (let dx = -REACH; dx <= REACH; dx++) {
        // a small pull toward "no shift", so a still shot doesn't read as drifting on noise
        const d = diffAt(a, b, dx, dy) + 0.002 * (Math.abs(dx) + Math.abs(dy))
        if (d < best) [best, at] = [d, [dx, dy]]
      }
    out.shift.push(at)
    const cells = new Array(GRID * GRID).fill(0)
    let total = 0
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const d = Math.abs(a[y * W + x] - b[y * W + x])
        cells[Math.floor((y * GRID) / H) * GRID + Math.floor((x * GRID) / W)] += d
        total += d
      }
    const per = (W * H) / (GRID * GRID)
    out.cells.push(cells.map((c) => c / per))
    out.energy.push(total / (W * H))
  }
  return out
}

function correlation(a: number[], b: number[]): number {
  const n = a.length
  const ma = a.reduce((s, x) => s + x, 0) / n
  const mb = b.reduce((s, x) => s + x, 0) / n
  let ab = 0
  let aa = 0
  let bb = 0
  for (let i = 0; i < n; i++) {
    ab += (a[i] - ma) * (b[i] - mb)
    aa += (a[i] - ma) ** 2
    bb += (b[i] - mb) ** 2
  }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0
}

export type MotionMatch = {
  /** "same": they move together; "different": they clearly don't; "unclear": the frames can't settle it */
  verdict: "same" | "different" | "unclear"
  /** how alike where-things-change is, -1 to 1 */
  where: number
  /** how far apart the camera paths are, in small-frame pixels per step */
  camera: number
  /** how much each moves overall */
  energy: [number, number]
}

/** below this, a video is as good as still */
const STILL = 0.035

export function compareMotion(a: Motion, b: Motion): MotionMatch {
  const n = Math.min(a.energy.length, b.energy.length)
  const mean = (m: Motion) => m.energy.slice(0, n).reduce((s, x) => s + x, 0) / n
  const energy: [number, number] = [mean(a), mean(b)]
  const where = correlation(a.cells.slice(0, n).flat(), b.cells.slice(0, n).flat())
  let camera = 0
  for (let i = 0; i < n; i++) camera += Math.hypot(a.shift[i][0] - b.shift[i][0], a.shift[i][1] - b.shift[i][1])
  camera /= n
  const still = energy.map((e) => e < STILL)
  let verdict: MotionMatch["verdict"]
  if (still[0] && still[1]) verdict = "same"
  else if (still[0] !== still[1]) verdict = Math.max(...energy) > STILL * 3 ? "different" : "unclear"
  else if (where >= 0.55 && camera <= 1.5) verdict = "same"
  else if (where < 0.2 || camera > 3) verdict = "different"
  else verdict = "unclear"
  return { verdict, where, camera, energy }
}

/** A video's frames at evenly spaced moments, small, for motionOf. */
export async function motionFrames(url: string): Promise<Uint8ClampedArray[]> {
  const v = document.createElement("video")
  v.muted = true
  v.playsInline = true
  v.crossOrigin = "anonymous"
  v.preload = "auto"
  v.src = url
  await new Promise<void>((ok, no) => {
    v.onloadeddata = () => ok()
    v.onerror = () => no(new Error("This video can't be read."))
  })
  const c = document.createElement("canvas")
  c.width = W
  c.height = H
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  const out: Uint8ClampedArray[] = []
  const len = v.duration
  for (let i = 0; i <= STEPS; i++) {
    const t = Math.min(len - 0.05, Math.max(0, (len * (i + 0.5)) / (STEPS + 1)))
    await new Promise<void>((ok) => {
      // the frame must be on screen, not only sought: a seek alone can leave the last frame up
      const shown = () => {
        const f = (v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => void }).requestVideoFrameCallback
        if (f) f.call(v, () => ok())
        setTimeout(ok, 250)
      }
      v.onseeked = shown
      v.currentTime = t
      setTimeout(ok, 4000)
    })
    ctx.drawImage(v, 0, 0, W, H)
    out.push(ctx.getImageData(0, 0, W, H).data)
  }
  v.removeAttribute("src")
  v.load()
  return out
}

export const motionOfVideo = async (url: string) => motionOf(await motionFrames(url))
