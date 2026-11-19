import type { Preview } from "@storybook/react-vite";
import "@seuil/tokens/tokens.css";
import "../src/styles.css";

const themes = [
  { value: "sante", title: "Santé - Clinique des Aubépines" },
  { value: "admin", title: "Administration - Commune de Valfleurie" },
  { value: "energie", title: "Énergie - Cascade Énergie" },
];

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Client theme",
      toolbar: { title: "Theme", icon: "paintbrush", items: themes, dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "sante" },
  decorators: [
    (Story, context) => (
      <div data-theme={context.globals.theme as string} className="seuil-root" lang="fr">
        <Story />
      </div>
    ),
  ],
};

export default preview;
