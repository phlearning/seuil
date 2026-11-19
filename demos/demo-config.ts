/**
 * Shared Vite setup for the three fictional clients. `vite preview` serves the
 * production build with the security headers a real host would send, so
 * security/headers audits something realistic.
 */
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import type { UserConfig } from "vite";

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export function demoConfig(dir: string, pages: string[], port: number, headers = SECURITY_HEADERS): UserConfig {
  return {
    // Relative asset paths: the same build works at the root and under /demos/<name>/ on the showcase.
    base: "./",
    plugins: [react()],
    build: {
      rollupOptions: { input: Object.fromEntries(pages.map((p) => [p, resolve(dir, `${p}.html`)])) },
    },
    preview: { port, strictPort: true, host: "127.0.0.1", headers },
  };
}
