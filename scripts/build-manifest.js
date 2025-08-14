// scripts/build-manifest.js
// Run: node scripts/build-manifest.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const OUT = path.join(ROOT, 'assets_manifest.js');

// Folders 0000..0060 expected; we’ll include any that exist.
const folders = fs.readdirSync(ASSETS).filter(d => /^\d{4}$/.test(d)).sort();

const manifest = {};
for (const dir of folders) {
  const full = path.join(ASSETS, dir);
  try {
    const files = fs.readdirSync(full)
      .filter(f => /\.png$/i.test(f))
      // sort so 00001 … 00060 … 00099 are in numeric order
      .sort((a, b) => {
        const na = parseInt((a.match(/_(\d{5})\.png$/)||[])[1] || '0', 10);
        const nb = parseInt((b.match(/_(\d{5})\.png$/)||[])[1] || '0', 10);
        return na - nb || a.localeCompare(b);
      });
    manifest[dir] = files;
  } catch (e) {
    manifest[dir] = [];
  }
}

const js = `/* Auto-generated: do not edit */
window.ASSETS_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;
fs.writeFileSync(OUT, js, 'utf8');
console.log(`Wrote ${OUT}`);

