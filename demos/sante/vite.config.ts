import { defineConfig } from "vite";
import { demoConfig } from "../demo-config.js";

export default defineConfig(demoConfig(import.meta.dirname, ["index", "rendez-vous", "plan-du-site"], 4301));
