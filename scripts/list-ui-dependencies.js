/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const uiDir = path.resolve(__dirname, '..', 'components', 'ui');

function collectFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    if (entry.isFile() && /\.tsx?$/.test(entry.name)) return [full];
    return [];
  });
}

const files = collectFiles(uiDir);
const modules = new Set();
const importRegex = /import[^"'`]*["'`]([^"'`]+)["'`]/g;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRegex.exec(source))) {
    const spec = match[1];
    if (!spec.startsWith('.') && !spec.startsWith('@/')) {
      modules.add(spec);
    }
  }
}

console.log(Array.from(modules).sort().join('\n'));
