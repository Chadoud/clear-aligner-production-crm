/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_API?: string | boolean;
  readonly VITE_LOG_LEVEL?: "debug" | "info" | "warn" | "error";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
