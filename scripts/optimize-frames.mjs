/**
 * Re-encode WebP animation frames at a lower quality setting to reduce
 * payload size (faster download + faster decode on first visit).
 *
 * Usage:
 *   node scripts/optimize-frames.mjs            # re-encode at quality 65
 *   node scripts/optimize-frames.mjs --quality 70
 *   node scripts/optimize-frames.mjs --dry-run  # show size estimates only
 *
 * Before running on all 1570 frames, check 10 representative frames manually:
 *   node scripts/optimize-frames.mjs --sample 10
 */

import sharp from "sharp";
import { readdir, rename, stat } from "fs/promises";
import { join } from "path";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SAMPLE = args.includes("--sample")
  ? parseInt(args[args.indexOf("--sample") + 1], 10)
  : 0;
const qualityArg = args.indexOf("--quality");
const QUALITY = qualityArg !== -1 ? parseInt(args[qualityArg + 1], 10) : 65;
const EFFORT = 4; // 0-6; 6 = max compression (slow), 4 = good balance
const CONCURRENCY = 8;

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
    // Pick evenly-spaced representative frames
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
        const tmpPath = inputPath + ".tmp";

        const beforeStat = await stat(inputPath);
        dirBefore += beforeStat.size;

        if (!DRY_RUN) {
          await sharp(inputPath)
            .webp({ quality: QUALITY, effort: EFFORT })
            .toFile(tmpPath);
          await rename(tmpPath, inputPath);
        }

        const afterStat = DRY_RUN
          ? // Estimate: WebP q65 typically 40-55% of q85-90 source
            { size: Math.round(beforeStat.size * 0.47) }
          : await stat(inputPath);
        dirAfter += afterStat.size;
      })
    );

    if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= files.length) {
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

function fmt(bytes) {
  if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(1) + " GB";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + " KB";
  return bytes + " B";
}
