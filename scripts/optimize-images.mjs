import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const imagesRoot = path.resolve("public/images");
const force = process.argv.includes("--force");
const supportedExtensions = new Set([".png", ".jpg", ".jpeg"]);

async function collectImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectImages(filePath);
      return supportedExtensions.has(path.extname(entry.name).toLowerCase()) ? [filePath] : [];
    }),
  );
  return nested.flat();
}

function settingsFor(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  if (normalized.includes("/images/store/")) return { maxSize: 1920, quality: 78 };
  if (normalized.includes("/images/brand/")) return { maxSize: 1600, quality: 86 };
  return { maxSize: 1400, quality: 82 };
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const sources = await collectImages(imagesRoot);
let originalBytes = 0;
let optimizedBytes = 0;
let converted = 0;
let skipped = 0;

for (const source of sources) {
  const output = source.replace(/\.(png|jpe?g)$/i, ".webp");
  const sourceStats = await stat(source);

  if (!force) {
    try {
      const outputStats = await stat(output);
      if (outputStats.mtimeMs >= sourceStats.mtimeMs) {
        skipped += 1;
        continue;
      }
    } catch {
      // The optimized version does not exist yet.
    }
  }

  const { maxSize, quality } = settingsFor(source);
  await sharp(source)
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(output);

  const outputStats = await stat(output);
  originalBytes += sourceStats.size;
  optimizedBytes += outputStats.size;
  converted += 1;
  console.log(`${path.relative(process.cwd(), source)} → ${formatSize(outputStats.size)}`);
}

if (converted > 0) {
  const savedPercent = Math.round((1 - optimizedBytes / originalBytes) * 100);
  console.log(`\n${converted} imagens otimizadas: ${formatSize(originalBytes)} → ${formatSize(optimizedBytes)} (${savedPercent}% menor).`);
}

if (skipped > 0) console.log(`${skipped} imagens já estavam atualizadas.`);
