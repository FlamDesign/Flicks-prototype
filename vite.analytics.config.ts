// Analytics experiment: a separate single-file build (analytics.html → dist-analytics/), so the main
// prototype's build and index.html stay untouched. Run: npx vite build -c vite.analytics.config.ts
import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: { outDir: "dist-analytics", rollupOptions: { input: path.resolve(__dirname, "analytics.html") } },
})
