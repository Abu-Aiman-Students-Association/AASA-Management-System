import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages serves from the repository subpath; temporary previews serve from the hostname root.
  base: mode === "preview" ? "/" : "/AASA-Management-System/",
}));
