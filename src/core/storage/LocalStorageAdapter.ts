import type { StorageAdapter } from "@/types/storage";
import { StorageError } from "@/core/errors/StorageError";

export class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      throw new StorageError(
        `Failed reading key "${key}" from localStorage`,
        error
      );
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new StorageError(
        `Failed writing key "${key}" to localStorage`,
        error
      );
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
