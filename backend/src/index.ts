import { buildApp, main } from "./app/index.js";

export { buildApp };

if (process.env.VITEST !== "true") {
  void main();
}
