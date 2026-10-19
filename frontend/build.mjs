// Builds the React app into ../nodejs/public (served by Express).
//   npm install   (once)
//   npm run build
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'nodejs', 'public');
const watch = process.argv.includes('--watch');

const result = await esbuild.build({
  entryPoints: [path.join(here, 'src', 'index.js')],
  bundle: true,
  minify: !watch,
  sourcemap: false,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  nodePaths: (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean),
  write: false,
  logLevel: 'info',
});

const code = result.outputFiles[0].contents;
const hash = crypto.createHash('md5').update(code).digest('hex').slice(0, 8);
const jsDir = path.join(out, 'static', 'js');
fs.rmSync(path.join(out, 'static'), { recursive: true, force: true });
fs.mkdirSync(jsDir, { recursive: true });
fs.writeFileSync(path.join(jsDir, `main.${hash}.js`), code);
fs.rmSync(path.join(out, 'asset-manifest.json'), { force: true });

const html = fs.readFileSync(path.join(here, 'public', 'index.html'), 'utf8')
  .replace('</head>', `  <script defer src="/static/js/main.${hash}.js"></script>\n</head>`);
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`Built static/js/main.${hash}.js (${(code.length / 1024).toFixed(0)} KB) → ${out}`);
