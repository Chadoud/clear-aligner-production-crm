import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/services.json", () => {
    return HttpResponse.json([]);
  }),
];
