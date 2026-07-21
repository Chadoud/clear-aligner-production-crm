import type { FastifyInstance } from "fastify";
import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import * as caseDocsRepo from "../../../repositories/caseDocsRepository.js";
import * as caseRepo from "../../../repositories/caseRepository.js";
import { config } from "../../../config.js";
import { loadAuthorizedCaseContext } from "../utils/caseAccess.js";
import { ALLOWED_UPLOAD_EXTENSIONS } from "./constants.js";

export async function registerCasesDocsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: { id: string } }>(
    "/api/v1/cases/:id/docs",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
      if (!ctx) return;
      const { caseId: id } = ctx;
      const docs = await caseDocsRepo.getDocsByCaseId(id);
      return reply.send({ docs });
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/cases/:id/docs",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
      if (!ctx) return;
      const { caseId: id, principal, caseRow } = ctx;

      let docType = "documents";
      let buffer: Buffer | null = null;
      let originalName = "file";
      let message = "";

      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buf = await part.toBuffer();
          if (!buffer) {
            buffer = buf;
            originalName = part.filename || "file";
          }
        } else if (part.type === "field" && part.fieldname === "docType") {
          docType = String(
            (part as { value?: string }).value ?? "documents"
          ).trim();
        } else if (part.type === "field" && part.fieldname === "message") {
          message = String((part as { value?: string }).value ?? "").trim();
        }
      }

      const isDocsPrives =
        docType === "docs-prives" || docType === "docs_prives";
      if (isDocsPrives && !buffer && message) {
        buffer = Buffer.from(message, "utf8");
        originalName = `${Date.now()}-note.txt`;
      }

      if (!buffer || !Buffer.isBuffer(buffer)) {
        return reply.status(400).send({ error: "No file in request" });
      }

      const ext = path.extname(originalName).toLowerCase();
      if (ext && !ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        return reply.status(400).send({
          error: `File type not allowed. Allowed: ${[...ALLOWED_UPLOAD_EXTENSIONS].join(", ")}`,
        });
      }

      const normalizedType = caseDocsRepo.normalizeDocType(
        docType,
        originalName
      );

      const safeBase = path
        .basename(originalName, path.extname(originalName))
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 64);
      const storedFilename = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeBase}${ext}`;

      const uploadsRoot = path.isAbsolute(config.uploadsDir)
        ? config.uploadsDir
        : path.join(process.cwd(), config.uploadsDir);
      const caseDir = path.join(uploadsRoot, String(id));

      await fs.mkdir(caseDir, { recursive: true });
      const destPath = path.join(caseDir, storedFilename);

      await fs.writeFile(destPath, buffer);

      const size = buffer.length;
      const sizeStr =
        size < 1024
          ? `${size} B`
          : size < 1024 * 1024
            ? `${(size / 1024).toFixed(1)} KB`
            : `${(size / (1024 * 1024)).toFixed(1)} MB`;

      const docsTitle =
        message && String(message).trim()
          ? `${originalName}|||${message.trim()}`
          : originalName;
      await caseDocsRepo.insertCaseDoc(
        id,
        normalizedType,
        storedFilename,
        sizeStr,
        docsTitle
      );

      if (!isDocsPrives) {
        const cabinetId = principal.cabinetId ?? null;
        const isDoctorUploading =
          cabinetId != null &&
          Number.isFinite(cabinetId) &&
          caseRow.cabinet_id === cabinetId;
        const newNotif = isDoctorUploading ? 2 : 1;
        await caseRepo.updateCaseNotif(id, newNotif, 0);
      }

      return reply.status(201).send({
        doc: {
          type: normalizedType,
          filename: originalName,
          storedFilename,
          size: sizeStr,
          message: isDocsPrives && message ? message : undefined,
        },
      });
    }
  );

  app.delete<{ Params: { id: string; filename: string } }>(
    "/api/v1/cases/:id/docs/:filename",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
      if (!ctx) return;
      const { caseId: id } = ctx;

      const rawFilename = req.params.filename;
      const safeFilename = path.basename(rawFilename).replace(/\.\./g, "");
      if (!safeFilename)
        return reply.status(400).send({ error: "Invalid filename" });

      const deleted = await caseDocsRepo.deleteCaseDoc(id, safeFilename);
      if (!deleted)
        return reply.status(404).send({ error: "Document not found" });

      const uploadsRoot = path.isAbsolute(config.uploadsDir)
        ? config.uploadsDir
        : path.join(process.cwd(), config.uploadsDir);
      const filePath = path.join(uploadsRoot, String(id), safeFilename);
      try {
        await fs.unlink(filePath);
      } catch {
        // File may already be missing; ignore
      }

      return reply.send({ ok: true });
    }
  );
}
