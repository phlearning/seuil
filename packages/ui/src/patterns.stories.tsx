import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, Checkbox, Form, Header, Modal, Select, TextField, type FormError } from "./index.js";

export default { title: "Patterns" } satisfies Meta;

type Story = StoryObj;

const cantons = [
  { value: "GE", label: "Genève" },
  { value: "VD", label: "Vaud" },
  { value: "VS", label: "Valais" },
  { value: "FR", label: "Fribourg" },
];

export const SelectDefault: Story = {
  name: "Select",
  render: () => <Select label="Canton de domicile" placeholder="Choisir un canton" options={cantons} required />,
};

export const CheckboxDefault: Story = {
  name: "Checkbox",
  render: () => (
    <Checkbox label="J'accepte que mes données soient transmises à mon médecin traitant" hint="Vous pouvez retirer cet accord à tout moment." />
  ),
};

export const HeaderDefault: Story = {
  name: "Header",
  render: () => (
    <>
      <Header
        siteName="Clinique des Aubépines"
        nav={[
          { label: "Accueil", href: "#", current: true },
          { label: "Prendre rendez-vous", href: "#rdv" },
          { label: "Contact", href: "#contact" },
        ]}
      />
      <main id="contenu">
        <p>Appuyez sur Tab depuis le haut de la page : le lien « Aller au contenu » apparaît en premier.</p>
      </main>
    </>
  ),
};

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Annuler le rendez-vous</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Annuler le rendez-vous du 3 décembre ?"
        actions={<Button onClick={() => setOpen(false)}>Confirmer l'annulation</Button>}
      >
        <p>Le créneau sera proposé à d'autres patients.</p>
      </Modal>
    </>
  );
}

export const ModalDefault: Story = { name: "Modal", render: () => <ModalDemo /> };

function FormDemo() {
  const [errors, setErrors] = useState<FormError[]>([]);
  const [sent, setSent] = useState(false);

  const validate = (data: FormData) => {
    const found: FormError[] = [];
    if (!String(data.get("nom") ?? "").trim()) found.push({ fieldId: "rdv-nom", message: "Indiquez votre nom" });
    if (!String(data.get("email") ?? "").includes("@")) found.push({ fieldId: "rdv-email", message: "Indiquez une adresse e-mail valide" });
    if (!data.get("canton")) found.push({ fieldId: "rdv-canton", message: "Choisissez votre canton" });
    setErrors(found);
    setSent(found.length === 0);
  };

  const errorFor = (id: string) => errors.find((e) => e.fieldId === id)?.message;

  return sent ? (
    <p role="status">Demande envoyée. Vous recevrez une confirmation par e-mail.</p>
  ) : (
    <Form onSubmit={validate} errors={errors} submitLabel="Demander un rendez-vous">
      <TextField id="rdv-nom" name="nom" label="Nom et prénom" autoComplete="name" required error={errorFor("rdv-nom")} />
      <TextField
        id="rdv-email"
        name="email"
        type="email"
        label="Adresse e-mail"
        autoComplete="email"
        required
        error={errorFor("rdv-email")}
      />
      <Select
        id="rdv-canton"
        name="canton"
        label="Canton de domicile"
        placeholder="Choisir un canton"
        options={cantons}
        required
        error={errorFor("rdv-canton")}
      />
      <Checkbox id="rdv-rappel" name="rappel" label="Recevoir un rappel par SMS la veille" />
    </Form>
  );
}

export const FormWithValidation: Story = { name: "Form with validation", render: () => <FormDemo /> };
