import { Alert } from "@seuil/ui";
import { mount } from "./layout.js";

mount(
  <>
    <h1>Demande enregistrée</h1>
    <Alert title="Votre demande a bien été reçue">
      Vous recevrez l'attestation de domicile par courrier sous trois jours ouvrables, avec un bulletin de versement de 20 francs.
    </Alert>
    <p>
      <a href="./index.html">Faire une autre demande</a>
    </p>
  </>,
);
