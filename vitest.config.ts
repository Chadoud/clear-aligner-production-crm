import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_USE_API": JSON.stringify("false"),
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["backend/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: ["src/main.jsx"],
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 45,
        statements: 55,
      },
    },
  },
  resolve: {
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
  },
});
