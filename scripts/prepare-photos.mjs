/**
 * OWT photo art direction — one treatment for every photograph on the site.
 *
 *   node scripts/prepare-photos.mjs            # all photos
 *   node scripts/prepare-photos.mjs riprap     # only names containing "riprap"
 *
 * Sources: assets/source/{photos,projects}/ — real OWT photos from owt.com.ua.
 * Output:  src/assets/{photos,projects}/
 *
 * The look: calm architectural / engineering photography.
 *   1. de-HDR      — pulls back exaggerated local contrast on over-processed sources
 *   2. white balance — every frame pulled to the same neutral (partial grey-world on mid-tones)
 *   3. levels      — identical black / white points for the whole series
 *   4. exposure    — identical mid-tone brightness
 *   5. tone curve  — moderate filmic S-curve, soft highlight shoulder, deep but open shadows
 *   6. colour      — loud greens and cyan/blues held back; machinery yellow, wood, concrete kept natural;
 *                    saturation brought to one shared level
 *   7. split tone  — barely-there cool shadows / neutral-warm highlights to tie the series together
 * Geometry is never changed beyond cropping: nothing is added, removed or retouched.
 */
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const only = process.argv[2];

/**
 * ratio: crop to this aspect (null = keep the original frame)
 * fx/fy: focal point the crop is centred on (0–1)
 * dehdr: 0–1, how much exaggerated local contrast to remove (only for over-processed sources)
 */
const JOBS = [
  // Full-bleed and section photography
  { set: 'photos', file: 'aerial-island.jpg', maxW: 2560, dehdr: 0.35 },
  { set: 'photos', file: 'aerial-marina.jpg', maxW: 2560, dehdr: 0 },
  { set: 'photos', file: 'shoreline.jpg', maxW: 2560, dehdr: 0.25 },
  { set: 'photos', file: 'marina-pier.jpg', maxW: 2560, dehdr: 0 },
  { set: 'photos', file: 'riprap.jpg', maxW: 2560, dehdr: 0.3 },
  { set: 'photos', file: 'longreach.jpg', maxW: 2560, dehdr: 0.3 },
  { set: 'photos', file: 'tree-lift.jpg', maxW: 2560, dehdr: 0 },
  { set: 'photos', file: 'pier-gangway.jpg', maxW: 2560, dehdr: 0 },
  // Hero portrait crops for phones (same photos, art-directed 3:5 frame): sharper and lighter
  // than scaling the landscape frame up to a tall phone screen.
  { set: 'photos', file: 'aerial-island.jpg', out: 'aerial-island-portrait.jpg', ratio: 3 / 5, fx: 0.5, fy: 0.5, maxW: 1200, dehdr: 0.35 },
  { set: 'photos', file: 'aerial-marina.jpg', out: 'aerial-marina-portrait.jpg', ratio: 3 / 5, fx: 0.55, fy: 0.5, maxW: 1200, dehdr: 0 },
  { set: 'photos', file: 'shoreline.jpg', out: 'shoreline-portrait.jpg', ratio: 3 / 5, fx: 0.35, fy: 0.5, maxW: 1200, dehdr: 0.25 },
  // Inner-page section photography
  { set: 'photos', file: 'dredging.jpg', maxW: 2560, dehdr: 0.3 },
  { set: 'photos', file: 'pool-pontoons.jpg', maxW: 2560, dehdr: 0.3 },
  { set: 'photos', file: 'tree-head.jpg', maxW: 2560, dehdr: 0 },
  { set: 'photos', file: 'jcb-shore.jpg', maxW: 2560, dehdr: 0.3 },
  { set: 'photos', file: 'jcb-pair.jpg', maxW: 2560, dehdr: 0 },
  { set: 'photos', file: 'marina-aerial.jpg', maxW: 2560, dehdr: 0 },
  { set: 'photos', file: 'pontoons-concrete.jpg', maxW: 2560, dehdr: 0 },
  // “Completed projects” series — identical 4:3 frames
  { set: 'projects', file: 'shore-concrete-pontoons.jpg', ratio: 4 / 3, fx: 0.5, fy: 0.5, maxW: 2000, dehdr: 0 },
  { set: 'projects', file: 'yacht-club.jpg', ratio: 4 / 3, fx: 0.46, fy: 0.5, maxW: 2000, dehdr: 0 },
  { set: 'projects', file: 'tree-transplanting.jpg', ratio: 4 / 3, fx: 0.3, fy: 0.5, maxW: 2000, dehdr: 0 },
  { set: 'projects', file: 'piers.jpg', ratio: 4 / 3, fx: 0.5, fy: 0.5, maxW: 2000, dehdr: 0.25 },
];

/**
 * Project galleries and the work archive are picked up automatically from
 * assets/source/{gallery,archive}/<group>/. Sources whose name contains
 * “adjust” were HDR-processed on the old site and get the gentle de-HDR.
 */
for (const [kind, maxW] of [['gallery', 1600], ['archive', 640]]) {
  const base = path.join(root, 'assets/source', kind);
  if (!fs.existsSync(base)) continue;
  for (const group of fs.readdirSync(base)) {
    const dir = path.join(base, group);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort()) {
      JOBS.push({ set: `${kind}/${group}`, file, maxW, dehdr: /adjust/i.test(file) ? 0.25 : 0 });
    }
  }
}

/** The shared look. Change it here and the whole site follows. */
const LOOK = {
  wbStrength: 0.65,
  black: 0.03, // output level of the 0.5th luminance percentile
  white: 0.9, // output level of the 99.7th luminance percentile — no blown highlights
  mid: 0.43, // mean luminance after levels
  contrast: 0.3, // 0 = linear, 1 = full logistic S-curve
  shoulderFrom: 0.78, // highlights above this are compressed…
  shoulder: 0.6, // …by this factor
  floor: 0.02, // shadows never crush to pure black
  green: 0.3, // how much to hold back greens (0–1)
  blue: 0.28, // how much to hold back cyan / blue
  satTarget: 0.2, // shared mean saturation
  satRange: [0.72, 1.04],
  splitShadow: [-0.004, 0, 0.008],
  splitHighlight: [0.006, 0.003, -0.004],
};

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function percentileOf(values, p) {
  const hist = new Uint32Array(1024);
  for (const v of values) hist[Math.min(1023, Math.floor(v * 1023))]++;
  const want = values.length * p;
  let acc = 0;
  for (let i = 0; i < 1024; i++) {
    acc += hist[i];
    if (acc >= want) return i / 1023;
  }
  return 1;
}

function lumaArray(px) {
  const out = new Float32Array(px.length / 3);
  for (let i = 0, j = 0; i < px.length; i += 3, j++) out[j] = luma(px[i], px[i + 1], px[i + 2]);
  return out;
}

async function load(job) {
  const src = path.join(root, 'assets/source', job.set, job.file);
  let img = sharp(src, { failOn: 'none' }).rotate();
  const { width, height } = await img.metadata();
  let w = width;
  let h = height;
  if (job.ratio) {
    let cw = width;
    let ch = Math.round(width / job.ratio);
    if (ch > height) {
      ch = height;
      cw = Math.round(height * job.ratio);
    }
    const left = Math.round(clamp(job.fx * width - cw / 2, 0, width - cw));
    const top = Math.round(clamp(job.fy * height - ch / 2, 0, height - ch));
    img = img.extract({ left, top, width: cw, height: ch });
    w = cw;
    h = ch;
  }
  const outW = Math.min(job.maxW, w);
  const outH = Math.round((outW / w) * h);
  const base = img.resize(outW, outH, { kernel: 'lanczos3' }).removeAlpha();
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  // Large-radius blur of the same frame, used to measure local contrast for de-HDR
  const sigma = Math.max(8, outW / 90);
  const blurred = job.dehdr > 0 ? await base.clone().blur(sigma).raw().toBuffer() : null;
  return { data, blurred, info };
}

function grade(px, blurred, job) {
  const n = px.length;

  // 1 — de-HDR: reduce the difference between a pixel and its neighbourhood
  if (blurred && job.dehdr > 0) {
    for (let i = 0; i < n; i += 3) {
      const L = luma(px[i], px[i + 1], px[i + 2]);
      const Lb = luma(blurred[i] / 255, blurred[i + 1] / 255, blurred[i + 2] / 255);
      const target = L - job.dehdr * (L - Lb);
      // bounded gain: never amplify shadow noise or paint halos around edges
      const k = L > 0.02 ? clamp(target / L, 0.88, 1.12) : 1;
      px[i] *= k;
      px[i + 1] *= k;
      px[i + 2] *= k;
    }
  }

  // 2 — white balance from neutral-ish mid-tones only
  let sr = 0, sg = 0, sb = 0, cnt = 0;
  for (let i = 0; i < n; i += 3) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const L = luma(r, g, b);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const s = mx > 0 ? (mx - mn) / mx : 0;
    if (L > 0.15 && L < 0.85 && s < 0.35) {
      sr += r; sg += g; sb += b; cnt++;
    }
  }
  if (cnt > 1000) {
    const grey = (sr + sg + sb) / (3 * cnt);
    const gains = [sr / cnt, sg / cnt, sb / cnt].map((m) => Math.pow(grey / m, LOOK.wbStrength));
    for (let i = 0; i < n; i += 3) {
      px[i] *= gains[0];
      px[i + 1] *= gains[1];
      px[i + 2] *= gains[2];
    }
  }

  // 3 — levels
  let L = lumaArray(px);
  const lo = percentileOf(L, 0.005);
  const hi = percentileOf(L, 0.997);
  const scale = (LOOK.white - LOOK.black) / Math.max(0.05, hi - lo);
  for (let i = 0; i < n; i++) px[i] = clamp((px[i] - lo) * scale + LOOK.black);

  // 4 — exposure (gamma towards a shared mid-tone)
  L = lumaArray(px);
  let mean = 0;
  for (const v of L) mean += v;
  mean /= L.length;
  const gamma = clamp(Math.log(LOOK.mid) / Math.log(clamp(mean, 0.05, 0.95)), 0.7, 1.4);

  // 5 — tone curve as a LUT
  const lut = new Float32Array(4096);
  const sig = (x) => 1 / (1 + Math.exp(-6 * (x - 0.5)));
  const s0 = sig(0), s1 = sig(1);
  for (let i = 0; i < 4096; i++) {
    let x = Math.pow(i / 4095, gamma);
    const s = (sig(x) - s0) / (s1 - s0);
    x = x + (s - x) * LOOK.contrast;
    if (x > LOOK.shoulderFrom) x = LOOK.shoulderFrom + (x - LOOK.shoulderFrom) * LOOK.shoulder;
    lut[i] = LOOK.floor + x * (1 - LOOK.floor);
  }
  for (let i = 0; i < n; i += 3) {
    // apply the curve to luminance and keep the hue: avoids colour shifts in saturated areas
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const l0 = luma(r, g, b);
    const l1 = lut[Math.round(clamp(l0) * 4095)];
    const k = l0 > 0.0005 ? l1 / l0 : 1;
    px[i] = r * k;
    px[i + 1] = g * k;
    px[i + 2] = b * k;
  }

  // 6 — selective colour, then shared saturation level
  let satSum = 0;
  for (let i = 0; i < n; i += 3) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const d = mx - mn;
    if (d < 1e-4) continue;
    let h;
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    const wGreen = Math.abs(h - 115) < 55 ? Math.cos(((h - 115) / 55) * (Math.PI / 2)) : 0;
    const wBlue = Math.abs(h - 205) < 45 ? Math.cos(((h - 205) / 45) * (Math.PI / 2)) : 0;
    const f = 1 - LOOK.green * wGreen - LOOK.blue * wBlue;
    const l = luma(r, g, b);
    px[i] = l + (r - l) * f;
    px[i + 1] = l + (g - l) * f;
    px[i + 2] = l + (b - l) * f;
    satSum += mx > 0 ? (Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2])) / Math.max(px[i], px[i + 1], px[i + 2], 1e-4) : 0;
  }
  const sat = satSum / (n / 3);
  const sf = clamp(LOOK.satTarget / Math.max(0.01, sat), LOOK.satRange[0], LOOK.satRange[1]);

  // 7 — saturation + split tone
  for (let i = 0; i < n; i += 3) {
    const l = luma(px[i], px[i + 1], px[i + 2]);
    const wS = 1 - smooth(0.1, 0.4, l);
    const wH = smooth(0.6, 0.9, l);
    for (let c = 0; c < 3; c++) {
      const v = l + (px[i + c] - l) * sf + LOOK.splitShadow[c] * wS + LOOK.splitHighlight[c] * wH;
      px[i + c] = clamp(v);
    }
  }

  return { lo: lo.toFixed(3), hi: hi.toFixed(3), gamma: gamma.toFixed(2), sat: sf.toFixed(2) };
}

for (const job of JOBS) {
  if (only && !`${job.set}/${job.out ?? job.file}`.includes(only)) continue;
  const { data, blurred, info } = await load(job);
  const px = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) px[i] = data[i] / 255;
  const report = grade(px, blurred, job);
  const out = Buffer.alloc(px.length);
  for (let i = 0; i < px.length; i++) out[i] = Math.round(px[i] * 255);
  const dest = path.join(root, 'src/assets', job.set, job.out ?? job.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(dest);
  console.log(`${job.set}/${job.out ?? job.file}`.padEnd(42), `${info.width}×${info.height}`, JSON.stringify(report));
}
