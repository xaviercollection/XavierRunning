/** Frame-loading primitives shared by every frame-sequence player. */

export function padFrame(index: number, digits = 3): string {
  return String(index).padStart(digits, "0");
}

/** index is 0-based; frame_001.webp is index 0. */
export function makeFrameSrcResolver(basePath: string, extension = "webp") {
  return (index: number) => `${basePath}/frame_${padFrame(index + 1)}.${extension}`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load frame: ${src}`));
    img.src = src;
  });
}

/** Runs `loadOne` over `indices` with a bounded number of parallel requests. */
export async function loadWithConcurrency(
  indices: number[],
  concurrency: number,
  loadOne: (index: number) => Promise<void>,
  isCancelled: () => boolean,
) {
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, indices.length));

  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < indices.length) {
      if (isCancelled()) return;
      const current = indices[cursor];
      cursor += 1;
      try {
        await loadOne(current);
      } catch {
        // A missing/broken frame shouldn't break the whole sequence.
      }
    }
  });

  await Promise.all(workers);
}
