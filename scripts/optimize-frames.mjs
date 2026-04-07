/**
 * Re-encode WebP animation frames at a lower quality setting to reduce
 * payload size (faster download + faster decode on first visit).
 *
 * Usage — directory scan (manual):
 *   node scripts/optimize-frames.mjs
 *   node scripts/optimize-frames.mjs --quality 70
 *   node scripts/optimize-frames.mjs --dry-run
 *   node scripts/optimize-frames.mjs --sample 10
 *
 * Usage — file list (called automatically by lint-staged on git commit):
 *   node scripts/optimize-frames.mjs /abs/path/frame-0001.webp /abs/path/frame-0002.webp
 */

import sharp from "sharp";
import { readdir, rename, stat } from "fs/promises";
import { join } from "path";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

const DRY_RUN = args.includes("--dry-run");
const SAMPLE = args.includes("--sample")
  ? parseInt(args[args.indexOf("--sample") + 1], 10)
  : 0;
const qualityIdx = args.indexOf("--quality");
const QUALITY = qualityIdx !== -1 ? parseInt(args[qualityIdx + 1], 10) : 65;
const EFFORT = 4; // 0–6; 4 = good compression/speed balance
const CONCURRENCY = 8;

// Flags whose next token is a value (not a file path)
const VALUE_FLAGS = new Set(["--quality", "--sample"]);

// Collect positional file paths: any arg that doesn't start with '--'
// and isn't the value token immediately after a value-consuming flag.
const positionalFiles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    if (VALUE_FLAGS.has(args[i])) i++; // skip the value token
    continue;
  }
  positionalFiles.push(args[i]);
}

const FILE_LIST_MODE = positionalFiles.length > 0;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function fmt(bytes) {
  if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(1) + " GB";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + " KB";
  return bytes + " B";
}

async function optimizeFile(inputPath, dryRun) {
  const tmpPath = inputPath + ".tmp";
  const beforeStat = await stat(inputPath);

  if (!dryRun) {
    try {
      await sharp(inputPath)
        .webp({ quality: QUALITY, effort: EFFORT })
        .toFile(tmpPath);
      await rename(tmpPath, inputPath);
    } catch (err) {
      // Clean up partial tmp file if sharp failed mid-write
      try { await import("fs/promises").then((fs) => fs.unlink(tmpPath)); } catch {}
      throw err;
    }
  }

  const afterStat = dryRun
    ? { size: Math.round(beforeStat.size * 0.47) } // estimate for dry-run
    : await stat(inputPath);

  return { before: beforeStat.size, after: afterStat.size };
}

// ---------------------------------------------------------------------------
// FILE LIST MODE — called by lint-staged on git commit
// Only processes the specific staged files passed as arguments.
// ---------------------------------------------------------------------------
if (FILE_LIST_MODE) {
  const webpFiles = positionalFiles.filter((f) => f.toLowerCase().endsWith(".webp"));

  if (webpFiles.length === 0) {
    process.exit(0);
  }

  console.log(
    `[optimize-frames] Optimizing ${webpFiles.length} staged frame(s) at quality ${QUALITY}...`
  );

  let totalBefore = 0;
  let totalAfter = 0;

  for (let i = 0; i < webpFiles.length; i += CONCURRENCY) {
    const batch = webpFiles.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (filePath) => {
        const { before, after } = await optimizeFile(filePath, false);
        totalBefore += before;
        totalAfter += after;
        const saved = before - after;
        const pct = before > 0 ? Math.round((saved / before) * 100) : 0;
        const name = filePath.replace(/\\/g, "/").split("/").pop();
        console.log(
          `  ✓ ${name}  ${fmt(before)} → ${fmt(after)}  (saved ${fmt(saved)}, ${pct}%)`
        );
      })
    );
  }

  const totalSaved = totalBefore - totalAfter;
  const totalPct = totalBefore > 0 ? Math.round((totalSaved / totalBefore) * 100) : 0;
  console.log(
    `[optimize-frames] ${fmt(totalBefore)} → ${fmt(totalAfter)} (saved ${fmt(totalSaved)}, ${totalPct}%)`
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// DIRECTORY SCAN MODE — manual full re-encode of all frames
// ---------------------------------------------------------------------------
const DIRS = [
  "public/frames/desktop",
  "public/frames/mobile",
];

console.log(
  `\n📦 WebP frame optimizer — quality ${QUALITY}, effort ${EFFORT}${DRY_RUN ? " [DRY RUN]" : ""}${SAMPLE ? ` [SAMPLE ${SAMPLE}]` : ""}\n`
);

let totalBefore = 0;
let totalAfter = 0;

for (const dir of DIRS) {
  const cwd = new URL(`../${dir}`, import.meta.url).pathname;
  let files;
  try {
    files = (await readdir(cwd)).filter((f) => f.endsWith(".webp")).sort();
  } catch {
    console.warn(`⚠️  Directory not found: ${dir}`);
    continue;
  }

  if (SAMPLE > 0) {
    const step = Math.max(1, Math.floor(files.length / SAMPLE));
    files = files.filter((_, i) => i % step === 0).slice(0, SAMPLE);
  }

  let dirBefore = 0;
  let dirAfter = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (file) => {
        const inputPath = join(cwd, file);
        const { before, after } = await optimizeFile(inputPath, DRY_RUN);
        dirBefore += before;
        dirAfter += after;
      })
    );

    if ((i + CONCURRENCY) % 80 === 0 || i + CONCURRENCY >= files.length) {
      const pct = Math.round(((i + CONCURRENCY) / files.length) * 100);
      process.stdout.write(
        `  ${dir}: ${Math.min(i + CONCURRENCY, files.length)}/${files.length} (${pct}%)\r`
      );
    }
  }

  const savings = dirBefore - dirAfter;
  const savingsPct = dirBefore > 0 ? Math.round((savings / dirBefore) * 100) : 0;
  console.log(
    `\n  ✅ ${dir}: ${fmt(dirBefore)} → ${fmt(dirAfter)} (saved ${fmt(savings)}, ${savingsPct}%)`
  );
  totalBefore += dirBefore;
  totalAfter += dirAfter;
}

const totalSavings = totalBefore - totalAfter;
const totalPct = totalBefore > 0 ? Math.round((totalSavings / totalBefore) * 100) : 0;
console.log(
  `\n🎉 Total: ${fmt(totalBefore)} → ${fmt(totalAfter)} (saved ${fmt(totalSavings)}, ${totalPct}%)\n`
);
