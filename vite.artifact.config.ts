import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// Multi-file build for publishing as an artifact: page under 16MB, media as separate files.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: { outDir: "dist-artifact", emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 100000 },
})
