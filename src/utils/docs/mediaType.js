const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "avi", "mkv"]);
const AUDIO_ONLY_EXT = new Set(["mp3", "m4a", "aac", "ogg", "wav"]);

function extensionOf(name) {
  const base = String(name || "").trim();
  const dot = base.lastIndexOf(".");
  return dot < 0 ? "" : base.slice(dot + 1).toLowerCase();
}

function isVoiceRecording(storedFilename, displayName) {
  const names = [storedFilename, displayName || ""].map((n) =>
    String(n).toLowerCase()
  );
  return names.some((n) => n.includes("voice.") || n.startsWith("voice"));
}

export function isDocImage(storedFilename, displayName) {
  return (
    IMAGE_EXT.has(extensionOf(storedFilename)) ||
    IMAGE_EXT.has(extensionOf(displayName || ""))
  );
}

export function isDocAudio(storedFilename, displayName) {
  if (isVoiceRecording(storedFilename, displayName)) return true;
  const ext = extensionOf(storedFilename) || extensionOf(displayName || "");
  // Mobile uploads: {timestamp}-{hash}-voice.webm on disk; display name voice.webm / voice.m4a.
  if (ext === "webm" || ext === "m4a" || ext === "mp4") {
    const names = [storedFilename, displayName || ""].map((n) =>
      String(n).toLowerCase()
    );
    if (names.some((n) => n.includes("voice") || n.includes("audio")))
      return true;
  }
  return (
    AUDIO_ONLY_EXT.has(extensionOf(storedFilename)) ||
    AUDIO_ONLY_EXT.has(extensionOf(displayName || ""))
  );
}

/** MIME type hint for <audio> / <source> in CRM preview. */
export function docAudioMimeType(storedFilename, displayName) {
  const ext = extensionOf(storedFilename) || extensionOf(displayName || "");
  switch (ext) {
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    case "webm":
    default:
      return "audio/webm";
  }
}

export function isDocVideo(storedFilename, displayName) {
  if (isDocAudio(storedFilename, displayName)) return false;
  return (
    VIDEO_EXT.has(extensionOf(storedFilename)) ||
    VIDEO_EXT.has(extensionOf(displayName || ""))
  );
}

export const DOC_IMAGE_EXT_REGEX = /\.(jpe?g|png|gif|webp|svg|bmp)$/i;
export const DOC_VIDEO_EXT_REGEX = /\.(mp4|webm|mov|m4v|avi|mkv)$/i;
