import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert, Button, Card, TextField } from "./index.js";

export default { title: "Components" } satisfies Meta;

type Story = StoryObj;

export const Buttons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-3)" }}>
      <Button>Prendre rendez-vous</Button>
      <Button variant="secondary">Annuler</Button>
    </div>
  ),
};

export const TextFieldDefault: Story = {
  name: "TextField",
  render: () => <TextField label="Numéro AVS" hint="13 chiffres, par exemple 756.1234.5678.97" required />,
};

export const TextFieldWithError: Story = {
  name: "TextField with error",
  render: () => <TextField label="Adresse e-mail" type="email" defaultValue="marie@" error="l'adresse e-mail est incomplète." />,
};

export const Alerts: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <Alert title="Demande envoyée">Vous recevrez une confirmation par e-mail.</Alert>
      <Alert title="Formulaire incomplet" tone="error">
        Deux champs obligatoires sont vides.
      </Alert>
    </div>
  ),
};

export const CardDefault: Story = {
  name: "Card",
  render: () => (
    <Card title="Consommation de novembre">
      <p>312 kWh, soit 8 % de moins qu'en octobre.</p>
      <Button variant="secondary">Voir le détail</Button>
    </Card>
  ),
};
