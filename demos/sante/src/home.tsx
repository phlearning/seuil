import { Card } from "@seuil/ui";
import { mount } from "./layout.js";

mount(
  "./index.html",
  <>
    <h1>Bienvenue à la Clinique des Aubépines</h1>
    <p>Consultations de médecine générale, de pédiatrie et de physiothérapie, du lundi au samedi.</p>
    <div className="demo-grid">
      <Card title="Prendre rendez-vous">
        <p>Choisissez un créneau en ligne, sans attente au téléphone.</p>
        <a href="./rendez-vous.html">Réserver une consultation</a>
      </Card>
      <Card title="Urgences">
        <p>En cas d'urgence vitale, appelez le 144.</p>
      </Card>
      <Card title="Horaires">
        <p>Lundi à vendredi de 7 h 30 à 19 h, samedi de 8 h à 12 h.</p>
      </Card>
    </div>
  </>,
);
