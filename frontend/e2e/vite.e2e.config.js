import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Builds a copy of the app for testing: Firebase is replaced by the stubs and the
// API address points at a fake host that the tests answer themselves.
const here = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: path.resolve(here, ".."),
  plugins: [react()],
  build: { outDir: path.resolve(here, ".dist"), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
  resolve: {
    alias: [
      { find: "firebase/auth", replacement: path.resolve(here, "stubs/firebase-auth.js") },
      { find: "firebase/app", replacement: path.resolve(here, "stubs/firebase-app.js") },
    ],
  },
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://api.test") },
});
