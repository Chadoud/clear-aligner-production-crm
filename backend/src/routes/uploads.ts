/**
 * Serve uploaded case documents from data/uploads/{caseId}/{filename}.
 * Matches /data/uploads/:caseId/:filename for frontend doc URLs.
 */
import type { FastifyInstance } from "fastify";
import path from "path";
import fs from "fs/promises";
import { config } from "../config.js";
import { caseDocContentType } from "../utils/caseDocMime.js";

function uploadsRoot(): string {
  return path.isAbsolute(config.uploadsDir)
    ? config.uploadsDir
    : path.join(process.cwd(), config.uploadsDir);
}

export async function uploadsRoutes(app: FastifyInstance): Promise<void> {
  const uploadsRootPath = uploadsRoot();

  app.get<{ Params: { caseId: string; filename: string } }>(
    "/data/uploads/:caseId/:filename",
    async (req, reply) => {
      const { caseId, filename } = req.params;
      if (!caseId || !filename) {
        return reply.status(400).send({ error: "Missing caseId or filename" });
      }
      const safeCaseId = caseId.replace(/[^0-9]/g, "");
      const safeFilename = path.basename(filename).replace(/\.\./g, "");
      if (!safeCaseId || !safeFilename) {
        return reply.status(400).send({ error: "Invalid caseId or filename" });
      }

      const filePath = path.join(uploadsRootPath, safeCaseId, safeFilename);
      let buffer: Buffer;
      try {
        buffer = await fs.readFile(filePath);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") {
          return reply.status(404).send({ error: "Not found" });
        }
        throw err;
      }

      const contentType = caseDocContentType(safeFilename);
      return reply
        .header("Content-Type", contentType)
        .header("Content-Length", String(buffer.length))
        .header("Cache-Control", "private, max-age=3600")
        .header("Accept-Ranges", "bytes")
        .send(buffer);
    }
  );
}
