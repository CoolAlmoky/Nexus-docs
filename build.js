#!/usr/bin/env node
/* build.js — bundles src/ into ONE self-contained HTML file (dist/nexus-docs.html).
   Usage:  node build.js            build once
           node build.js --watch    rebuild when anything in src/ changes
   Add new source files to ORDER below (dependencies first). */
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const ORDER = [
  'src/core/Util.js',
  'src/core/SafeStorage.js',
  'src/core/EventBus.js',
  'src/core/Feature.js',
  'src/features/PageFX.js',
  'src/features/Ruler.js',
  'src/features/TextFX.js',
  'src/legacy/main.js',          // the not-yet-split remainder; runs last
];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function build() {
  const missing = ORDER.filter(f => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) throw new Error('Missing files in ORDER: ' + missing.join(', '));
  const js = ORDER.map(f => '/* ===== ' + f + ' ===== */\n' + read(f)).join('\n');
  if (/<\/script/i.test(js)) throw new Error('A source file contains "</script" — write it as "<\\/script" inside strings.');
  const tpl = read('src/template.html');
  if (!tpl.includes('<!-- @SCRIPTS -->')) throw new Error('template.html has no <!-- @SCRIPTS --> marker');
  const html = tpl.replace('<!-- @SCRIPTS -->', () => '<script>\n' + js + '\n</script>');
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  const out = path.join(ROOT, 'dist/nexus-docs.html');
  fs.writeFileSync(out, html);
  console.log('built', path.relative(ROOT, out), '(' + Math.round(html.length / 1024) + ' KB)');
}

build();
if (process.argv.includes('--watch')) {
  let t; fs.watch(path.join(ROOT, 'src'), { recursive: true }, () => { clearTimeout(t); t = setTimeout(() => { try { build(); } catch (e) { console.error(e.message); } }, 100); });
  console.log('watching src/ ...');
}
