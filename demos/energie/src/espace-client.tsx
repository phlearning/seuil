import { Alert, Button, Card, Modal } from "@seuil/ui";
import { useState } from "react";
import { mount } from "./layout.js";

function EBill() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <Card title="Facture électronique">
      <p>{active ? "Vous recevez vos factures par e-mail." : "Recevez vos factures par e-mail plutôt que par courrier."}</p>
      {!active && <Button onClick={() => setOpen(true)}>Activer la e-facture</Button>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Activer la facture électronique ?"
        actions={
          <Button
            onClick={() => {
              setActive(true);
              setOpen(false);
            }}
          >
            Activer
          </Button>
        }
      >
        <p>Vos prochaines factures seront envoyées à l'adresse e-mail de votre compte.</p>
      </Modal>
    </Card>
  );
}

mount(
  "./index.html",
  <>
    <h1>Bonjour Marie Rochat</h1>
    <Alert title="Relevé de compteur">Votre relevé du 2 décembre sera estimé si vous ne le transmettez pas avant cette date.</Alert>
    <div className="demo-grid">
      <Card title="Consommation de novembre">
        <p>312 kWh, soit 8 % de moins qu'en octobre.</p>
        <a href="./consommation.html">Voir le détail</a>
      </Card>
      <Card title="Prochaine facture">
        <p>CHF 84.60, échéance le 15 décembre.</p>
      </Card>
      <EBill />
    </div>
  </>,
);
