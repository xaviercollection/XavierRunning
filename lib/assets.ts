import fs from "node:fs";
import path from "node:path";

/**
 * Server-only check for whether a real asset has been dropped into /public.
 * Lets sections render a premium placeholder until the final file arrives,
 * with zero code changes needed once it does.
 */
export function publicFileExists(relativePath: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", relativePath));
  } catch {
    return false;
  }
}

/** Finds the first existing public asset among common extensions, e.g. "images/store/xavier-store". */
export function findPublicImage(basePathNoExt: string, extensions = ["jpg", "jpeg", "webp", "png"]): string | null {
  for (const ext of extensions) {
    const relative = `${basePathNoExt}.${ext}`;
    if (publicFileExists(relative)) return `/${relative}`;
  }
  return null;
}
