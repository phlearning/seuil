import sumBy from "lodash/sumBy";
import { mount } from "./layout.js";

const MONTHS = [
  ["Juin", 228],
  ["Juillet", 214],
  ["Août", 221],
  ["Septembre", 259],
  ["Octobre", 339],
  ["Novembre", 312],
] as const;

mount(
  "./consommation.html",
  <>
    <h1>Consommation d'électricité</h1>
    <p>Relevés mensuels de votre compteur, en kilowattheures.</p>
    <table className="demo-table">
      <caption>Consommation des six derniers mois</caption>
      <thead>
        <tr>
          <th scope="col">Mois</th>
          <th scope="col">kWh</th>
        </tr>
      </thead>
      <tbody>
        {MONTHS.map(([month, kwh]) => (
          <tr key={month}>
            <th scope="row">{month}</th>
            <td>{kwh}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td>{sumBy(MONTHS, ([, kwh]) => kwh)}</td>
        </tr>
      </tfoot>
    </table>
  </>,
);
