import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works when served from a GitHub Pages subpath
  // (https://<user>.github.io/<repo>/) as well as at a domain root.
  base: "./",
  server: { port: 5173, host: true },
});
