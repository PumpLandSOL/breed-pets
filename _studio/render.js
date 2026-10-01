'use strict';
// BREED brand-kit rasterizer. ABSOLUTE file:// URL + ABSOLUTE --screenshot path required.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const OUT = path.join(__dirname, 'out');
const DESKTOP = 'C:/Users/efrai/OneDrive/Desktop';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const SIZES = {
  'breed-pfp': [2000, 2000],
  'breed-banner': [3000, 1000],
  'breed-keyart': [2400, 1350],
  'breed-species': [2400, 1350],
  'breed-howitworks': [2400, 1350],
  'breed-rules': [2400, 1350],
  'breed-whisper': [2400, 1350],
  'breed-scored': [2400, 1350],
  'breed-moltbook': [2400, 1350],
  'breed-rwa': [2400, 1350],
  'breed-own': [2400, 1350],
};

const only = process.argv[2];
for (const name of Object.keys(SIZES).filter((n) => !only || n === only)) {
  const htmlPath = path.join(OUT, name + '.html');
  if (!fs.existsSync(htmlPath)) { console.log('SKIP (no html):', name); continue; }
  const [w, h] = SIZES[name];
  const png = path.join(DESKTOP, name + '.png');
  const r = spawnSync(CHROME, [
    '--headless=new', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--default-background-color=00000000',
    '--user-data-dir=' + path.join(os.tmpdir(), 'tmk_' + name + '_' + Date.now()),
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--window-size=' + w + ',' + h, '--virtual-time-budget=5000',
    '--screenshot=' + png, 'file:///' + htmlPath.replace(/\\/g, '/'),
  ], { stdio: 'ignore', timeout: 60000 });
  const sz = fs.existsSync(png) ? fs.statSync(png).size : 0;
  console.log((r.status === 0 ? 'OK  ' : 'ERR ') + name + '  ' + w + 'x' + h + '  ' + sz + ' bytes -> ' + png);
}
