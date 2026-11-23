import { defineConfig } from "vite";
import { demoConfig, SECURITY_HEADERS } from "../demo-config.js";

// gtag needs its inline snippet
const { "Content-Security-Policy": _csp, ...headers } = SECURITY_HEADERS;

export default defineConfig(demoConfig(import.meta.dirname, ["index", "consommation", "plan-du-site"], 4303, headers));
