import path from "path";

const AUDIO_EXT = new Set(["mp3", "m4a", "aac", "ogg", "wav", "mp4"]);

function extensionOf(name: string): string {
  return path
    .extname(String(name || ""))
    .slice(1)
    .toLowerCase();
}

function isVoiceFilename(name: string): boolean {
  const lower = String(name || "").toLowerCase();
  return lower.includes("voice.") || lower.startsWith("voice");
}

/** Content-Type for case upload files (Discussion voice notes, images, etc.). */
export function caseDocContentType(
  storedFilename: string,
  displayName?: string
): string {
  const ext = extensionOf(storedFilename) || extensionOf(displayName || "");
  if (
    ["m4a", "mp4"].includes(ext) &&
    isVoiceFilename(storedFilename + displayName)
  ) {
    return "audio/mp4";
  }
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "wav") return "audio/wav";
  if (ext === "webm") {
    if (isVoiceFilename(storedFilename) || isVoiceFilename(displayName || "")) {
      return "audio/webm";
    }
    return "video/webm";
  }
  if (AUDIO_EXT.has(ext)) return "audio/mp4";

  const imageMime: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  };
  return imageMime[ext] ?? "application/octet-stream";
}
