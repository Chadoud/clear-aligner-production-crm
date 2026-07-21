/**
 * Application-wide storage instance.
 * All persistence should go through this abstraction so adapters can be swapped.
 */
import { StorageService } from "./StorageService";
import { LocalStorageAdapter } from "./LocalStorageAdapter";

const APP_NAMESPACE = "aligner-crm";

let instance: StorageService | null = null;

export function getAppStorage(): StorageService {
  if (!instance) {
    instance = new StorageService(APP_NAMESPACE, new LocalStorageAdapter());
  }
  return instance;
}
