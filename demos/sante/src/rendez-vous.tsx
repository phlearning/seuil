import { Checkbox, Form, Select, TextField, type FormError } from "@seuil/ui";
import { useEffect, useRef, useState } from "react";
import { mount } from "./layout.js";

const MOTIFS = [
  { value: "generaliste", label: "Médecine générale" },
  { value: "pediatrie", label: "Pédiatrie" },
  { value: "physio", label: "Physiothérapie" },
];

/** Replaces the form: takes focus so keyboard and screen reader users land on it (WCAG 4.1.3, 2.4.3). */
function Confirmation() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="seuil-alert">
      <h2 ref={heading} tabIndex={-1} className="seuil-alert__title">
        Demande envoyée
      </h2>
      <p>Nous vous confirmerons le créneau par e-mail dans la journée.</p>
    </div>
  );
}

function Booking() {
  const [errors, setErrors] = useState<FormError[]>([]);
  const [sent, setSent] = useState(false);

  const submit = (data: FormData) => {
    const found: FormError[] = [];
    if (!String(data.get("nom") ?? "").trim()) found.push({ fieldId: "nom", message: "Indiquez votre nom et prénom" });
    if (!String(data.get("email") ?? "").includes("@")) found.push({ fieldId: "email", message: "Indiquez une adresse e-mail valide, par exemple marie@exemple.ch" });
    if (!data.get("motif")) found.push({ fieldId: "motif", message: "Choisissez le motif de consultation" });
    setErrors(found);
    setSent(found.length === 0);
  };
  const error = (id: string) => errors.find((e) => e.fieldId === id)?.message;

  if (sent) return <Confirmation />;
  return (
    <Form onSubmit={submit} errors={errors} submitLabel="Demander un rendez-vous">
      <TextField id="nom" name="nom" label="Nom et prénom" autoComplete="name" required error={error("nom")} />
      <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="email" required error={error("email")} />
      <TextField id="naissance" name="naissance" label="Date de naissance" hint="Par exemple 14.03.1985" autoComplete="bday" />
      <Select id="motif" name="motif" label="Motif de consultation" placeholder="Choisir un motif" options={MOTIFS} required error={error("motif")} />
      <Checkbox id="rappel" name="rappel" label="Recevoir un rappel par SMS la veille" />
      <fieldset className="demo-fieldset">
        <legend>Questionnaire préalable (facultatif)</legend>
        <input name="allergies" placeholder="Allergies connues" className="seuil-field__input" />
        <input name="traitement" placeholder="Traitement en cours" className="seuil-field__input" />
      </fieldset>
    </Form>
  );
}

function ArrivalNotice() {
  const [open, setOpen] = useState(true);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    button.current?.focus();
    const keepFocus = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", keepFocus);
    return () => document.removeEventListener("keydown", keepFocus);
  }, [open]);

  if (!open) return null;
  return (
    <div className="seuil-alert" style={{ position: "fixed", inset: "20% 10% auto", background: "var(--color-bg-default)", zIndex: 5 }}>
      <p>Merci de remplir le questionnaire préalable avant votre consultation.</p>
      <button ref={button} type="button" className="seuil-button seuil-button--primary" onClick={() => setOpen(false)}>
        J'ai compris
      </button>
    </div>
  );
}

mount(
  "./rendez-vous.html",
  <>
    <h1>Prendre rendez-vous</h1>
    <p>Les champs marqués d'un astérisque sont obligatoires.</p>
    <ArrivalNotice />
    <Booking />
  </>,
);
