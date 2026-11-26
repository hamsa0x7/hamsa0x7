import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_PATH = path.join(ROOT, 'state.json');
const SVG_DIR = path.join(ROOT, 'assets', 'svg');

fs.mkdirSync(SVG_DIR, { recursive: true });

const stateData = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const validStates = ['calm', 'surge', 'eclipse'];
const activeState = validStates.includes(stateData.state) ? stateData.state : 'calm';

const PALETTES = {
  light: {
    bg: '#f6efe2',
    bgAlt: '#ede2ce',
    border: '#cbb899',
    ink: '#2d2419',
    muted: '#7d6b52',
    accent: '#b87624',
  },
  dark: {
    bg: '#080e17',
    bgAlt: '#0e1724',
    border: '#1c2d42',
    ink: '#d9ecff',
    muted: '#5e7a99',
    accent: '#4deeea',
  }
};

function makeHorizonSVG(theme) {
  const p = PALETTES[theme];
  const ritualStr = String(stateData.rituals).padStart(4, '0');
  const stateUpper = activeState.toUpperCase();
  const waveFreq = activeState === 'surge' ? 0.045 : activeState === 'eclipse' ? 0.025 : 0.016;
  const waveAmp = activeState === 'surge' ? 9 : activeState === 'eclipse' ? 6 : 3.5;

  // Procedural horizon wave path
  let wavePath = 'M 0 56';
  for (let x = 0; x <= 900; x += 12) {
    const y = 56 + Math.sin(x * waveFreq + stateData.rituals) * waveAmp;
    wavePath += ` L ${x} ${y.toFixed(1)}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 72" width="900" height="72">
  <rect width="900" height="72" fill="${p.bg}"/>
  <line x1="0" y1="71.5" x2="900" y2="71.5" stroke="${p.border}" stroke-width="1"/>
  <path d="${wavePath}" fill="none" stroke="${p.accent}" stroke-width="1.2" opacity="0.45"/>

  <!-- Left: Coordinate & State -->
  <circle cx="24" cy="28" r="3.5" fill="${p.accent}">
    <animate attributeName="opacity" values="1;0.3;1" dur="2.6s" repeatCount="indefinite"/>
  </circle>
  <text x="38" y="32" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="2.2" fill="${p.ink}">TIDAL MONOLITH // ${stateUpper}</text>

  <!-- Center geometric glyph -->
  <g transform="translate(450, 28)">
    <polygon points="0,-11 11,0 0,11 -11,0" fill="none" stroke="${p.accent}" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="${activeState === 'eclipse' ? 4.5 : 2.5}" fill="${p.accent}"/>
  </g>

  <!-- Right: Ritual counter & handle -->
  <text x="876" y="32" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="2" fill="${p.muted}">RITUALS ${ritualStr} // HAMSA0X7</text>
</svg>`;
}

function makeTileSVG(theme, { index, label, sub, active = false, glyph = 'diamond' }) {
  const p = PALETTES[theme];
  const bg = active ? p.bgAlt : p.bg;
  const stroke = active ? p.accent : p.border;

  let icon = '';
  if (glyph === 'eye') {
    icon = `<circle cx="26" cy="28" r="8" fill="none" stroke="${p.accent}" stroke-width="1.2"/>
            <circle cx="26" cy="28" r="2.5" fill="${p.accent}"/>`;
  } else if (glyph === 'wave') {
    icon = `<path d="M 16 28 Q 21 21 26 28 T 36 28" fill="none" stroke="${p.accent}" stroke-width="1.4"/>`;
  } else if (glyph === 'octa') {
    icon = `<polygon points="26,18 35,28 26,38 17,28" fill="none" stroke="${p.accent}" stroke-width="1.2"/>
            <line x1="17" y1="28" x2="35" y2="28" stroke="${p.accent}" stroke-width="0.9" opacity="0.6"/>`;
  } else if (glyph === 'back') {
    icon = `<path d="M 32 28 L 20 28 M 25 23 L 20 28 L 25 33" fill="none" stroke="${p.accent}" stroke-width="1.4"/>`;
  } else {
    icon = `<rect x="20" y="22" width="12" height="12" transform="rotate(45 26 28)" fill="${active ? p.accent : 'none'}" stroke="${p.accent}" stroke-width="1.2"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 56" width="300" height="56">
  <rect x="0.5" y="0.5" width="299" height="55" fill="${bg}" stroke="${stroke}" stroke-width="1"/>
  ${icon}
  <text x="48" y="25" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10.5" font-weight="600" letter-spacing="1.8" fill="${p.ink}">${index}  ${label}</text>
  <text x="48" y="40" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9.5" letter-spacing="1.2" fill="${active ? p.accent : p.muted}">${sub}</text>
</svg>`;
}

for (const theme of ['light', 'dark']) {
  fs.writeFileSync(path.join(SVG_DIR, `horizon-${theme}.svg`), makeHorizonSVG(theme));

  const tiles = [
    ['tile-sanctum', { index: '01', label: 'ENTER OCULUS', sub: 'VIEW // INTERIOR', glyph: 'eye' }],
    ['tile-submerged', { index: '02', label: 'BENEATH BASIN', sub: 'VIEW // SUBMERGED', glyph: 'wave' }],
    ['tile-relic', { index: '03', label: 'CORE RELIC', sub: 'VIEW // MACRO', glyph: 'octa' }],
    ['tile-state-calm', { index: 'A', label: 'CALM BASIN', sub: activeState === 'calm' ? 'ACTIVE // MIRROR' : 'MUTATE // STILL', active: activeState === 'calm', glyph: 'state' }],
    ['tile-state-surge', { index: 'B', label: 'TIDAL SURGE', sub: activeState === 'surge' ? 'ACTIVE // RESONANCE' : 'MUTATE // WAVE', active: activeState === 'surge', glyph: 'state' }],
    ['tile-state-eclipse', { index: 'C', label: 'SOLAR ECLIPSE', sub: activeState === 'eclipse' ? 'ACTIVE // ALIGNED' : 'MUTATE // ECLIPSE', active: activeState === 'eclipse', glyph: 'state' }],
    ['tile-return', { index: '00', label: 'RETURN TO SHORELINE', sub: 'EXIT // MAIN SHRINE', glyph: 'back' }],
  ];

  for (const [name, opts] of tiles) {
    fs.writeFileSync(path.join(SVG_DIR, `${name}-${theme}.svg`), makeTileSVG(theme, opts));
  }
}

function pictureTag(darkSrc, lightSrc, width, alt) {
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${darkSrc}"><img src="${lightSrc}" width="${width}" alt="${alt}" /></picture>`;
}

// Update README.md to reference the active state's 3D WebP using <picture> for clean single-variant dark/light rendering
const readmeContent = `<p align="center">${pictureTag('./assets/svg/horizon-dark.svg', './assets/svg/horizon-light.svg', '100%', 'Tidal Monolith')}<a href="https://github.com/hamsa0x7/hamsa0x7/blob/main/views/sanctum.md">${pictureTag(`./assets/3d/main-${activeState}-dark.webp`, `./assets/3d/main-${activeState}-light.webp`, '100%', 'Surreal Desert Water Shrine')}</a></p>

<p align="center"><a href="https://github.com/hamsa0x7/hamsa0x7/blob/main/views/sanctum.md">${pictureTag('./assets/svg/tile-sanctum-dark.svg', './assets/svg/tile-sanctum-light.svg', '33.33%', 'Enter Oculus')}</a><a href="https://github.com/hamsa0x7/hamsa0x7/blob/main/views/submerged.md">${pictureTag('./assets/svg/tile-submerged-dark.svg', './assets/svg/tile-submerged-light.svg', '33.33%', 'Beneath Basin')}</a><a href="https://github.com/hamsa0x7/hamsa0x7/blob/main/views/relic.md">${pictureTag('./assets/svg/tile-relic-dark.svg', './assets/svg/tile-relic-light.svg', '33.33%', 'Core Relic')}</a></p>

<p align="center"><a href="https://github.com/hamsa0x7/hamsa0x7/issues/new?title=shrine:calm&body=Return+the+basin+to+stillness.">${pictureTag('./assets/svg/tile-state-calm-dark.svg', './assets/svg/tile-state-calm-light.svg', '33.33%', 'State: Calm')}</a><a href="https://github.com/hamsa0x7/hamsa0x7/issues/new?title=shrine:surge&body=Raise+the+tidal+resonance.">${pictureTag('./assets/svg/tile-state-surge-dark.svg', './assets/svg/tile-state-surge-light.svg', '33.33%', 'State: Surge')}</a><a href="https://github.com/hamsa0x7/hamsa0x7/issues/new?title=shrine:eclipse&body=Align+the+celestial+eclipse.">${pictureTag('./assets/svg/tile-state-eclipse-dark.svg', './assets/svg/tile-state-eclipse-light.svg', '33.33%', 'State: Eclipse')}</a></p>
`;

fs.writeFileSync(path.join(ROOT, 'README.md'), readmeContent);
console.log(`Updated README.md and SVGs for state="${activeState}", rituals=${stateData.rituals}`);
