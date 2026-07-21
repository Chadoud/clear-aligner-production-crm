import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export function uploadsRootFromConfig(uploadsDir: string): string {
  return path.isAbsolute(uploadsDir)
    ? uploadsDir
    : path.join(process.cwd(), uploadsDir);
}

function uploadsRoot(): string {
  return uploadsRootFromConfig(config.uploadsDir);
}

function safeStoredFilename(name: string | null | undefined): string {
  return (
    String(name ?? "")
      .trim()
      .replace(/\.\./g, "")
      .split(/[/\\]/)
      .pop() ?? ""
  );
}

/** Remove data/uploads/{caseId}/{file} from disk. */
export async function deleteCaseDocFile(
  caseId: number,
  storedFilename: string
): Promise<boolean> {
  const safeCaseId = String(caseId).replace(/[^0-9]/g, "");
  const safeName = safeStoredFilename(storedFilename);
  if (!safeCaseId || !safeName) return false;

  const filePath = path.join(uploadsRoot(), safeCaseId, safeName);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return false;
    throw err;
  }
}

export async function deleteCaseDocFiles(
  caseId: number,
  filenames: string[]
): Promise<void> {
  const list = [...new Set(filenames.map(safeStoredFilename).filter(Boolean))];
  for (const name of list) {
    await deleteCaseDocFile(caseId, name).catch(() => false);
  }
}
