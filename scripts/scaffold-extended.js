#!/usr/bin/env node
/**
 * Scaffold per-episode Markdown stubs from window.DB in data.js
 * Usage: node scripts/scaffold-extended.js
 *
 * Creates:
 *   episodes/<series-id>/S<season>E<episode>.md
 * and does NOT overwrite existing files.
 */

const fs = require('fs/promises');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'data.js');
const EPISODES_DIR = path.join(ROOT, 'episodes');

function mdStub({ seriesTitle, seriesId, seasonN, seasonTitle, epN, epTitle, epSummary }) {
  // zero-pad episode to 2 digits (E01..E09, E10..)
  const E = String(epN).padStart(2, '0');
  const S = String(seasonN); // single digit is fine (S1..S4)

  return `**${epTitle}** — Extended

_${seriesTitle}_ • **Season ${S}: ${seasonTitle}** • **Episode ${epN} (S${S}E${E})**

### Recap (from data.js)
${epSummary || '_No short summary provided yet._'}

---

### Long Synopsis

`;
}

async function readDB() {
  const src = await fs.readFile(DATA_JS, 'utf8');

  // Evaluate data.js in an isolated context that exposes "window"
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(src, context, { filename: 'data.js' });

  const DB = context.window.DB;
  if (!DB || !Array.isArray(DB.series)) {
    throw new Error('Could not find window.DB.series in data.js');
  }
  return DB;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(p) {
  try { await fs.access(p); return true; }
  catch { return false; }
}

async function main() {
  const DB = await readDB();
  await ensureDir(EPISODES_DIR);

  let created = 0, skipped = 0;
  for (const series of DB.series) {
    const seriesId = series.id;
    const seriesTitle = series.title;
    const seriesDir = path.join(EPISODES_DIR, seriesId);
    await ensureDir(seriesDir);

    for (const season of series.seasons) {
      const seasonN = Number(season.n);
      const seasonTitle = season.title;

      for (const ep of season.episodes) {
        const epN = Number(ep.n);
        const E = String(epN).padStart(2, '0');
        const S = String(seasonN);
        const fname = `S${S}E${E}.md`;
        const fpath = path.join(seriesDir, fname);

        if (await fileExists(fpath)) {
          skipped++;
          continue;
        }

        const body = mdStub({
          seriesTitle,
          seriesId,
          seasonN,
          seasonTitle,
          epN,
          epTitle: ep.title,
          epSummary: ep.summary || ''
        });

        await fs.writeFile(fpath, body, 'utf8');
        created++;
      }
    }
  }

  console.log(`Scaffold complete. Created ${created} file(s), skipped ${skipped} (already existed).`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

