import type { Page } from "./types.js";

/** Which page material helps judge which criterion. Screenshots are always offered. */
const MATERIAL: Record<string, ("images" | "headings" | "landmarks" | "titles" | "links" | "lang" | "langParts" | "fields")[]> = {
  "1.1.1": ["images"],
  "1.4.5": ["images"],
  "1.3.1": ["headings", "landmarks", "fields"],
  "2.4.6": ["headings", "fields"],
  "2.4.1": ["landmarks"],
  "2.4.2": ["titles"],
  "2.4.4": ["links"],
  "2.4.5": ["links"],
  "3.2.3": ["links"],
  "3.1.1": ["lang"],
  "3.1.2": ["langParts"],
  "1.3.5": ["fields"],
  "2.5.3": ["fields"],
  "3.3.1": ["fields"],
  "3.3.2": ["fields"],
  "3.3.3": ["fields"],
  "3.3.4": ["fields"],
  "3.3.7": ["fields"],
};

const empty = <p className="review-muted">Aucun élément.</p>;

export function Material({ id, pages }: { id: string; pages: Page[] }) {
  const kinds = MATERIAL[id] ?? [];
  return (
    <div className="review-material">
      {pages.map((p) => (
        <section key={p.page} className="review-page" aria-label={`Matériel : ${p.title}`}>
          <h4>
            {p.title} <span className="review-muted">({p.url})</span>
          </h4>
          {kinds.includes("titles") && <p>Titre de la page : « {p.title} »</p>}
          {kinds.includes("lang") && <p>Langue déclarée : {p.lang || "aucune"}</p>}
          {kinds.includes("landmarks") && <p>Repères : {p.landmarks.join(", ") || "aucun"}</p>}
          {kinds.includes("headings") &&
            (p.headings.length === 0 ? empty : (
              <ul className="review-outline">
                {p.headings.map((h, i) => (
                  <li key={i} style={{ marginInlineStart: `${(h.level - 1) * 1.25}rem` }}>
                    h{h.level} {h.text}
                  </li>
                ))}
              </ul>
            ))}
          {kinds.includes("images") &&
            (p.images.length === 0 ? empty : (
              <div className="review-table-wrap" role="region" aria-label="Tableau" tabIndex={0}>
              <table className="demo-table">
                <caption>Images et alternatives</caption>
                <thead>
                  <tr>
                    <th scope="col">Image</th>
                    <th scope="col">Texte alternatif</th>
                  </tr>
                </thead>
                <tbody>
                  {p.images.map((img) => (
                    <tr key={img.selector}>
                      <td>
                        <code>{img.src || img.selector}</code>
                      </td>
                      <td>{img.alt === null ? "absent" : img.alt === "" ? "vide (décorative)" : img.alt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ))}
          {kinds.includes("links") &&
            (p.links.length === 0 ? empty : (
              <ul>
                {p.links.map((l, i) => (
                  <li key={i}>
                    « {l.text || "sans texte"} » vers <code>{l.href}</code>
                  </li>
                ))}
              </ul>
            ))}
          {kinds.includes("langParts") &&
            (p.langParts.length === 0 ? empty : (
              <ul>
                {p.langParts.map((l, i) => (
                  <li key={i}>
                    lang="{l.lang}" : {l.text}
                  </li>
                ))}
              </ul>
            ))}
          {kinds.includes("fields") &&
            (p.fields.length === 0 ? empty : (
              <div className="review-table-wrap" role="region" aria-label="Tableau" tabIndex={0}>
              <table className="demo-table">
                <caption>Champs de formulaire</caption>
                <thead>
                  <tr>
                    <th scope="col">Étiquette</th>
                    <th scope="col">Type</th>
                    <th scope="col">autocomplete</th>
                    <th scope="col">Obligatoire</th>
                  </tr>
                </thead>
                <tbody>
                  {p.fields.map((f) => (
                    <tr key={f.selector}>
                      <td>{f.label || "aucune"}</td>
                      <td>{f.type}</td>
                      <td>{f.autocomplete || "-"}</td>
                      <td>{f.required ? "oui" : "non"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ))}
          {p.screenshot && (
            <p>
              <a href={`./screens/${encodeURIComponent(p.screenshot)}`} target="_blank" rel="noreferrer">
                Capture complète de la page (nouvel onglet)
              </a>
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
