import { defineConfig } from "vite";
import { demoConfig, SECURITY_HEADERS } from "../demo-config.js";

const headers = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'",
};

export default defineConfig(demoConfig(import.meta.dirname, ["index", "confirmation", "plan-du-site"], 4302, headers));
