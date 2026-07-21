import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function profileImagesRoot(rootDir: string): string {
  return path.isAbsolute(rootDir) ? rootDir : path.join(process.cwd(), rootDir);
}

export async function saveProfileImageFile(
  buffer: Buffer,
  originalName: string,
  rootDir: string
): Promise<{ filename: string; storedPath: string }> {
  let ext = path.extname(originalName || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) ext = ".jpg";
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = profileImagesRoot(rootDir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return { filename, storedPath: `/data/profile/${filename}` };
}

export function safeProfileFilename(raw: string): string | null {
  const name = path.basename(String(raw ?? "")).replace(/\.\./g, "");
  if (!name || !/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  return name;
}
