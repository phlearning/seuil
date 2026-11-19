import { Alert, Button, Card, Modal } from "@seuil/ui";
import { useEffect, useRef, useState } from "react";
import { mount } from "./layout.js";

function EBill() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const confirmation = useRef<HTMLParagraphElement>(null);

  // The button that opened the dialog disappears once activated: focus the confirmation
  // instead of letting it fall back to the top of the page (WCAG 2.4.3, 4.1.3).
  useEffect(() => {
    if (active) confirmation.current?.focus();
  }, [active]);

  return (
    <Card title="Facture électronique">
      {active ? (
        <p ref={confirmation} tabIndex={-1}>
          E-facture activée : vous recevez désormais vos factures par e-mail.
        </p>
      ) : (
        <>
          <p>Recevez vos factures par e-mail plutôt que par courrier.</p>
          <Button onClick={() => setOpen(true)}>Activer la e-facture</Button>
        </>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Activer la facture électronique ?"
        actions={
          <Button
            onClick={() => {
              setOpen(false);
              setActive(true);
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
