/**
 * Background-removal bake-off harness.
 *
 * Runs every configured provider over a directory of sample photos and writes the cut-outs
 * plus a latency/size report so the production default can be picked on evidence.
 *
 *   npx tsx -r dotenv/config scripts/bake-off-bg-removal.ts --input ./samples --out ./bakeoff
 *   npx tsx -r dotenv/config scripts/bake-off-bg-removal.ts --input ./samples --providers birefnet,photoroom
 */
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getBackgroundRemover } from "../lib/ai/background";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

interface Row {
  image: string;
  provider: string;
  ms: number | null;
  bytes: number | null;
  error: string | null;
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

async function main() {
  const inputDir = path.resolve(arg("input", "./samples"));
  const outDir = path.resolve(arg("out", "./bakeoff"));
  const providers = arg("providers", "birefnet,photoroom,removebg")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const files = (await readdir(inputDir)).filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase())).sort();
  if (files.length === 0) throw new Error(`No images found in ${inputDir}`);

  const available = providers.filter((id) => {
    const configured = getBackgroundRemover(id).isConfigured();
    if (!configured) console.warn(`Skipping ${id}: not configured`);
    return configured;
  });
  if (available.length === 0) throw new Error("No configured providers to compare");

  await mkdir(outDir, { recursive: true });
  const rows: Row[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const dataUrl = `data:${MIME_BY_EXTENSION[ext]};base64,${(await readFile(path.join(inputDir, file))).toString("base64")}`;

    for (const id of available) {
      const started = Date.now();
      try {
        const { bytes, contentType } = await getBackgroundRemover(id).removeBackground(dataUrl);
        const ms = Date.now() - started;
        const outExt = contentType === "image/webp" ? "webp" : "png";
        await mkdir(path.join(outDir, id), { recursive: true });
        await writeFile(path.join(outDir, id, `${path.basename(file, ext)}.${outExt}`), bytes);
        rows.push({ image: file, provider: id, ms, bytes: bytes.length, error: null });
        console.log(`${file} ${id}: ${ms}ms ${(bytes.length / 1024).toFixed(0)}KB`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        rows.push({ image: file, provider: id, ms: null, bytes: null, error: message });
        console.error(`${file} ${id}: FAILED ${message}`);
      }
    }
  }

  const csv = ["image,provider,ms,bytes,error", ...rows.map((r) => `${r.image},${r.provider},${r.ms ?? ""},${r.bytes ?? ""},"${r.error ?? ""}"`)].join("\n");
  await writeFile(path.join(outDir, "results.csv"), `${csv}\n`);

  for (const id of available) {
    const ok = rows.filter((r) => r.provider === id && r.ms !== null);
    const median = ok.map((r) => r.ms as number).sort((a, b) => a - b)[Math.floor(ok.length / 2)];
    console.log(`${id}: ${ok.length}/${files.length} succeeded, median ${median ?? "n/a"}ms`);
  }
  console.log(`Wrote cut-outs and results.csv to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
