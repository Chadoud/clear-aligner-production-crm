import { AppError } from "./AppError";

export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "STORAGE_ERROR", details);
    this.name = "StorageError";
  }
}
