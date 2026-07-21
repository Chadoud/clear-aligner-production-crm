import type { StorageAdapter } from "@/types/storage";
import { LocalStorageAdapter } from "./LocalStorageAdapter";

export class StorageService {
  constructor(
    private readonly namespace: string,
    private readonly adapter: StorageAdapter = new LocalStorageAdapter()
  ) {}

  private key(rawKey: string): string {
    return `${this.namespace}:${rawKey}`;
  }

  get<T>(rawKey: string): T | null {
    return this.adapter.get<T>(this.key(rawKey));
  }

  set<T>(rawKey: string, value: T): void {
    this.adapter.set(this.key(rawKey), value);
  }

  remove(rawKey: string): void {
    this.adapter.remove(this.key(rawKey));
  }
}
