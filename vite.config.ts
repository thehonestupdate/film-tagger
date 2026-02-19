import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // IMPORTANT:
  // - If you host on Cloudflare Pages: base should be "/"
  // - If you host on GitHub Pages: base should be "/film-tagger/"
  base: "/",

  server: {
    proxy: {
      // During `vite dev`, this forwards /api/* to your Worker
      "/api": {
        target: "https://film-tagger-worker.thehonestupdate.workers.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});