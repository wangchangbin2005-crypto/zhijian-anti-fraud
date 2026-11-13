/**
 * 统计项目代码行数（排除 node_modules、构建产物等）
 * 用法：在项目根目录执行  node scripts/count-lines.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules',
  'miniprogram_npm',
  '.git',
  'cloudfunctions',
  'dist',
  'build',
  '.cursor',
]);

const EXT_RE = /\.(js|json|wxml|wxss|wxs|ts|tsx|less|scss|css|html|md)$/i;

let totalLines = 0;
let totalFiles = 0;
const byExt = {};

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const name = ent.name;
    const full = path.join(dir, name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full);
      continue;
    }
    if (!EXT_RE.test(name)) continue;
    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/).length;
    const ext = path.extname(name).toLowerCase() || '(noext)';
    byExt[ext] = (byExt[ext] || 0) + lines;
    totalLines += lines;
    totalFiles += 1;
  }
}

walk(ROOT);

const extRows = Object.entries(byExt)
  .sort((a, b) => b[1] - a[1])
  .map(([ext, n]) => `  ${ext.padEnd(8)} ${String(n).padStart(8)} 行`);

console.log('');
console.log('项目根目录:', ROOT);
console.log('统计范围: *.js *.json *.wxml *.wxss *.wxs *.ts *.tsx *.css *.less *.scss *.html *.md');
console.log('已排除目录:', [...SKIP_DIRS].join(', '));
console.log('');
console.log('── 按扩展名 ──');
console.log(extRows.join('\n'));
console.log('');
console.log('── 合计 ──');
console.log(`  文件数: ${totalFiles}`);
console.log(`  总行数: ${totalLines}`);
console.log('');
