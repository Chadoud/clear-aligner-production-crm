import type { ServiceItem } from "@/types";
import { apiClient } from "./apiClientSingleton";

const servicesCache = new Map<string, Promise<ServiceItem[]>>();

export class ServicesApiClient {
  constructor(private readonly client = apiClient) {}

  getServices(path: string): Promise<ServiceItem[]> {
    const cached = servicesCache.get(path);
    if (cached) return cached;
    const promise = this.client.request<ServiceItem[]>(path);
    servicesCache.set(path, promise);
    return promise;
  }
}
