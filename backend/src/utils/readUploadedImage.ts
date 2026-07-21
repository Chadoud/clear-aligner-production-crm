import type { FastifyRequest } from "fastify";

const MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_FIELDS = new Set([
  "logo",
  "cabinet_logo",
  "profile_image",
  "file",
  "image",
]);

export async function readUploadedImage(
  req: FastifyRequest
): Promise<{ buffer: Buffer; filename: string; mimetype: string } | null> {
  const data = await req.file();
  if (!data) return null;

  const field = String(data.fieldname ?? "");
  if (!IMAGE_FIELDS.has(field)) {
    throw Object.assign(new Error("Unexpected upload field"), {
      statusCode: 400,
    });
  }

  const mimetype = String(data.mimetype ?? "").toLowerCase();
  if (!mimetype.startsWith("image/")) {
    throw Object.assign(new Error("Profile image must be an image file"), {
      statusCode: 400,
    });
  }

  const buffer = await data.toBuffer();
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error("Image must be 2 MB or smaller"), {
      statusCode: 400,
    });
  }

  return {
    buffer,
    filename: data.filename || "photo.jpg",
    mimetype,
  };
}
