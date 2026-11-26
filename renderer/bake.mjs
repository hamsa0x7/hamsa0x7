import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const FRAMES_DIR = path.join(ROOT, '.tmp-frames');
const OUT_DIR = path.join(ROOT, 'assets', '3d');

fs.mkdirSync(OUT_DIR, { recursive: true });

// Minimal static server for local Three.js ES module loading
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const filePath = path.join(ROOT, urlPath === '/' ? 'renderer/shrine.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl']
});

// Bake jobs:
// - Main profile views in all 3 world states (calm, surge, eclipse) x 2 themes (light, dark)
// - Sub-views (sanctum, submerged, relic) in calm state x 2 themes (light, dark)
const JOBS = [
  { view: 'main', state: 'calm', theme: 'light', w: 900, h: 520, frames: 48, fps: 16 },
  { view: 'main', state: 'calm', theme: 'dark', w: 900, h: 520, frames: 48, fps: 16 },
  { view: 'main', state: 'surge', theme: 'light', w: 900, h: 520, frames: 48, fps: 16 },
  { view: 'main', state: 'surge', theme: 'dark', w: 900, h: 520, frames: 48, fps: 16 },
  { view: 'main', state: 'eclipse', theme: 'light', w: 900, h: 520, frames: 48, fps: 16 },
  { view: 'main', state: 'eclipse', theme: 'dark', w: 900, h: 520, frames: 48, fps: 16 },
  { view: 'sanctum', state: 'calm', theme: 'light', w: 900, h: 520, frames: 40, fps: 16 },
  { view: 'sanctum', state: 'calm', theme: 'dark', w: 900, h: 520, frames: 40, fps: 16 },
  { view: 'submerged', state: 'calm', theme: 'light', w: 900, h: 520, frames: 40, fps: 16 },
  { view: 'submerged', state: 'calm', theme: 'dark', w: 900, h: 520, frames: 40, fps: 16 },
  { view: 'relic', state: 'calm', theme: 'light', w: 900, h: 520, frames: 40, fps: 16 },
  { view: 'relic', state: 'calm', theme: 'dark', w: 900, h: 520, frames: 40, fps: 16 },
];

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
  await page.goto(`http://127.0.0.1:${port}/renderer/shrine.html?w=900&h=520`, { waitUntil: 'networkidle' });

  for (const job of JOBS) {
    const outName = `${job.view}-${job.state}-${job.theme}.webp`;
    const outPath = path.join(OUT_DIR, outName);
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
    fs.mkdirSync(FRAMES_DIR, { recursive: true });

    console.log(`Rendering ${outName} (${job.frames} frames)...`);
    for (let i = 0; i < job.frames; i++) {
      const progress = i / job.frames;
      await page.evaluate(
        ([p, t, s, v]) => window.renderSceneFrame(p, t, s, v),
        [progress, job.theme, job.state, job.view]
      );
      const frameFile = path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`);
      await page.locator('canvas').screenshot({ path: frameFile });
    }

    execFileSync('ffmpeg', [
      '-y',
      '-framerate', String(job.fps),
      '-i', path.join(FRAMES_DIR, 'frame_%04d.png'),
      '-vcodec', 'libwebp',
      '-lossless', '0',
      '-q:v', '82',
      '-loop', '0',
      '-preset', 'drawing',
      '-an',
      outPath,
    ], { stdio: 'ignore' });

    const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`  -> ${outName} (${sizeKB} KB)`);
  }
} finally {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  await browser.close();
  server.close();
}
