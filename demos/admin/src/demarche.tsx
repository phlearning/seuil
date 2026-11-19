import { Checkbox, Form, Select, TextField, type FormError } from "@seuil/ui";
import { useState } from "react";
import { mount } from "./layout.js";

const USAGES = [
  { value: "employeur", label: "Pour un employeur" },
  { value: "banque", label: "Pour une banque" },
  { value: "autre", label: "Autre usage" },
];

function Demarche() {
  const [errors, setErrors] = useState<FormError[]>([]);

  const submit = (data: FormData) => {
    const found: FormError[] = [];
    if (!String(data.get("nom") ?? "").trim()) found.push({ fieldId: "nom", message: "Indiquez votre nom et prénom" });
    if (!/^756[.\d]{10,13}$/.test(String(data.get("avs") ?? "").trim())) found.push({ fieldId: "avs", message: "Indiquez un numéro AVS commençant par 756" });
    if (!data.get("usage")) found.push({ fieldId: "usage", message: "Choisissez l'usage de l'attestation" });
    if (!data.get("exactitude")) found.push({ fieldId: "exactitude", message: "Confirmez l'exactitude des informations" });
    setErrors(found);
    if (found.length === 0) window.location.assign("./confirmation.html");
  };
  const error = (id: string) => errors.find((e) => e.fieldId === id)?.message;

  return (
    <Form onSubmit={submit} errors={errors} submitLabel="Envoyer la demande">
      <TextField id="nom" name="nom" label="Nom et prénom" autoComplete="name" required error={error("nom")} />
      <TextField id="avs" name="avs" label="Numéro AVS" hint="13 chiffres, par exemple 756.1234.5678.97" inputMode="numeric" required error={error("avs")} />
      <Select id="usage" name="usage" label="Usage de l'attestation" placeholder="Choisir un usage" options={USAGES} required error={error("usage")} />
      <Checkbox id="exactitude" name="exactitude" label="Je confirme l'exactitude des informations fournies" required error={error("exactitude")} />
    </Form>
  );
}

mount(
  <>
    <h1>Demander une attestation de domicile</h1>
    <p>L'attestation vous est envoyée par courrier sous trois jours ouvrables. Émolument : 20 francs.</p>
    <Demarche />
  </>,
);
