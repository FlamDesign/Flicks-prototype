import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// The site as deployed to Cloudflare Pages: served from the root of its own host, so pages can
// have real paths (/p/<id>); media as separate files. public/_redirects sends every path to the app.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: { outDir: "dist-pages", emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 100000 },
})
