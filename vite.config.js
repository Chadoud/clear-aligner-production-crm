/* eslint-env node */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCAL_BACKEND = "http://localhost:4000";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const docsProxyTarget = env.VITE_DOCS_PROXY_TARGET?.trim() || LOCAL_BACKEND;

  return {
    plugins: [react()],
    resolve: {
      extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@/hooks": path.resolve(__dirname, "./src/hooks"),
        "@/utils": path.resolve(__dirname, "./src/utils"),
        "@/services": path.resolve(__dirname, "./src/services"),
        "@/components": path.resolve(__dirname, "./src/components"),
        "@/constants": path.resolve(__dirname, "./src/constants"),
        "@/config": path.resolve(__dirname, "./src/config"),
        "@/context": path.resolve(__dirname, "./src/context"),
        "@/data": path.resolve(__dirname, "./src/data"),
        "@/routes": path.resolve(__dirname, "./src/routes"),
        "@aligner-crm/domain": path.resolve(
          __dirname,
          "./packages/domain/src/index.ts"
        ),
      },
      dedupe: [],
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
          timeout: 60000,
        },
        "/socket.io": {
          target: LOCAL_BACKEND,
          changeOrigin: true,
          ws: true,
        },
        "/health": { target: LOCAL_BACKEND, changeOrigin: true },
        "/data": {
          target: docsProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
