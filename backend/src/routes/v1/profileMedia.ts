import type { FastifyInstance } from "fastify";
import fs from "fs/promises";
import path from "path";
import { config } from "../../config.js";
import {
  profileImagesRoot,
  safeProfileFilename,
} from "../../utils/profileImageStorage.js";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function mimeFor(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

/** Optional mobile API fallback for profiles uploaded outside this CRM. */
async function fetchMobileApiProfileImage(
  filename: string
): Promise<Buffer | null> {
  const base = config.mobileApiBaseUrl.replace(/\/$/, "");
  const url = `${base}/uploads/profile/${encodeURIComponent(filename)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function readProfileImageBuffer(safe: string): Promise<Buffer | null> {
  const filePath = path.join(profileImagesRoot(config.profileDir), safe);
  try {
    return await fs.readFile(filePath);
  } catch {
    return fetchMobileApiProfileImage(safe);
  }
}

export async function profileMediaRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { filename: string } }>(
    "/api/v1/media/profile/:filename",
    async (req, reply) => {
      const safe = safeProfileFilename(req.params.filename);
      if (!safe) {
        return reply.status(400).send({ error: "Invalid filename" });
      }
      const buffer = await readProfileImageBuffer(safe);
      if (!buffer) {
        return reply.status(404).send({ error: "Not found" });
      }
      return reply
        .header("Content-Type", mimeFor(safe))
        .header("Cache-Control", "public, max-age=86400")
        .header("Cross-Origin-Resource-Policy", "cross-origin")
        .header("Access-Control-Allow-Origin", "*")
        .header("Content-Length", String(buffer.length))
        .send(buffer);
    }
  );
}
