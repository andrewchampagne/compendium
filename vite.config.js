import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    // The Python backend (and the PDFs Office writes into backend/data) is not part of the web build.
    watch: { ignored: ["**/backend/**"] },
  },
});
