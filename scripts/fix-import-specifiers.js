/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const uiDir = path.resolve(__dirname, '..', 'components', 'ui');

function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getFiles(fullPath);
    }
    if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      return [fullPath];
    }
    return [];
  });
}

const files = getFiles(uiDir);
const pattern = /(["'`])([^"'`]+?)@[0-9][^"'`]*\1/g;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const updated = original.replace(pattern, (match, quote, spec) => {
    return `${quote}${spec}${quote}`;
  });
  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
  }
}
