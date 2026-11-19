import { Alert, Checkbox, Form, Select, TextField, type FormError } from "@seuil/ui";
import { useState } from "react";
import { mount } from "./layout.js";

const MOTIFS = [
  { value: "generaliste", label: "Médecine générale" },
  { value: "pediatrie", label: "Pédiatrie" },
  { value: "physio", label: "Physiothérapie" },
];

function Booking() {
  const [errors, setErrors] = useState<FormError[]>([]);
  const [sent, setSent] = useState(false);

  const submit = (data: FormData) => {
    const found: FormError[] = [];
    if (!String(data.get("nom") ?? "").trim()) found.push({ fieldId: "nom", message: "Indiquez votre nom et prénom" });
    if (!String(data.get("email") ?? "").includes("@")) found.push({ fieldId: "email", message: "Indiquez une adresse e-mail valide" });
    if (!data.get("motif")) found.push({ fieldId: "motif", message: "Choisissez le motif de consultation" });
    setErrors(found);
    setSent(found.length === 0);
  };
  const error = (id: string) => errors.find((e) => e.fieldId === id)?.message;

  if (sent) {
    return <Alert title="Demande envoyée">Nous vous confirmerons le créneau par e-mail dans la journée.</Alert>;
  }
  return (
    <Form onSubmit={submit} errors={errors} submitLabel="Demander un rendez-vous">
      <TextField id="nom" name="nom" label="Nom et prénom" autoComplete="name" required error={error("nom")} />
      <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="email" required error={error("email")} />
      <TextField id="naissance" name="naissance" label="Date de naissance" hint="Par exemple 14.03.1985" autoComplete="bday" />
      <Select id="motif" name="motif" label="Motif de consultation" placeholder="Choisir un motif" options={MOTIFS} required error={error("motif")} />
      <Checkbox id="rappel" name="rappel" label="Recevoir un rappel par SMS la veille" />
    </Form>
  );
}

mount(
  "./rendez-vous.html",
  <>
    <h1>Prendre rendez-vous</h1>
    <p>Les champs marqués d'un astérisque sont obligatoires.</p>
    <Booking />
  </>,
);
