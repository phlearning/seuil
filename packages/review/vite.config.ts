import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base: the CLI serves dist/ from its own local server.
export default defineConfig({ plugins: [react()], base: "./" });
