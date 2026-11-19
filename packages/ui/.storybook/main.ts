import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  // No usage data leaves the machine: same promise as Seuil itself.
  core: { disableTelemetry: true },
  // The static build lands in storybook-static: watching it would reload the dev server on every build or audit.
  viteFinal: (vite) => mergeConfig(vite, { server: { watch: { ignored: ["**/storybook-static/**"] } } }),
};

export default config;
