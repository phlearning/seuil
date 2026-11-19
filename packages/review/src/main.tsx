import "@seuil/tokens/tokens.css";
import "@seuil/ui/styles.css";
import "./review.css";
import { Alert, Select } from "@seuil/ui";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CriterionCard } from "./CriterionCard.js";
import type { State, Status, Verdict } from "./types.js";

type Filter = "all" | "todo" | "fail" | "done";
const FILTERS: Record<Filter, (s: Status) => boolean> = {
  all: () => true,
  todo: (s) => s === "to-review",
  fail: (s) => s === "auto-fail" || s === "reviewed-fail",
  done: (s) => s === "reviewed-ok" || s === "reviewed-fail" || s === "not-applicable",
};
const VERDICT_LABEL = { compliant: "Conforme", "non-compliant": "Non conforme", incomplete: "Incomplet" };

function App() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todo");
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    fetch("./api/state")
      .then((r) => r.json() as Promise<State>)
      .then(setState)
      .catch((e: Error) => setError(e.message));
  }, []);

  const save = async (id: string, verdict: Verdict | null, comment: string) => {
    const response = await fetch("./api/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, verdict, comment }),
    });
    if (!response.ok) {
      setError(`Enregistrement refusé (${response.status}).`);
      return;
    }
    const next = (await response.json()) as State;
    // The saved card may leave the current view: keep keyboard users in place by
    // moving focus to the criterion that followed it (or the last one shown).
    const order = state?.coverage.map((c) => c.criterion.id) ?? [];
    const after = order.slice(order.indexOf(id));
    setState(next);
    setAnnounce(`Critère ${id} enregistré. ${next.summary.resolved} sur ${next.summary.total} évalués.`);
    requestAnimationFrame(() => {
      const headings = [...document.querySelectorAll<HTMLElement>("[data-criterion]")];
      const target = after.map((a) => headings.find((h) => h.dataset.criterion === a)).find(Boolean) ?? headings.at(-1);
      target?.focus();
    });
  };

  if (error) return <Alert title="Erreur" tone="error">{error}</Alert>;
  if (!state) return <p role="status">Chargement...</p>;

  const shown = state.coverage.filter((c) => FILTERS[filter](c.status));
  return (
    <>
      <header className="review-header">
        <h1>Audit guidé WCAG 2.2 AA</h1>
        <p className="review-muted">
          Résultats du {new Date(state.generatedAt).toLocaleString("fr-CH")} · auditeur : {state.reviewer} · {state.inventory.length} page(s)
        </p>
        <div className="review-progress">
          <label htmlFor="progress">
            {state.summary.resolved} critères sur {state.summary.total} évalués ({state.summary.percent} %)
          </label>
          <progress id="progress" max={state.summary.total} value={state.summary.resolved} />
          <p>
            WCAG 2.2 AA : <strong>{VERDICT_LABEL[state.summary.verdict]}</strong> · eCH-0059 : <strong>{VERDICT_LABEL[state.ech.verdict]}</strong> ·{" "}
            {state.summary.failed} non conforme(s)
          </p>
        </div>
      </header>
      <main id="contenu" className="review-main">
        <div className="review-filter">
          <Select
            id="filter"
            label="Afficher"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            options={[
              { value: "todo", label: `À vérifier (${state.coverage.filter((c) => c.status === "to-review").length})` },
              { value: "fail", label: `Non conformes (${state.coverage.filter((c) => FILTERS.fail(c.status)).length})` },
              { value: "done", label: "Déjà évalués" },
              { value: "all", label: "Tous les critères" },
            ]}
          />
        </div>
        {shown.length === 0 && <p>Aucun critère dans cette vue.</p>}
        {["1", "2", "3", "4"].map((p) => {
          const items = shown.filter((c) => c.criterion.principle === p);
          if (items.length === 0) return null;
          return (
            <section key={p} aria-labelledby={`principle-${p}`}>
              <h2 id={`principle-${p}`}>
                {p}. {state.principles[p]?.[state.lang]}
              </h2>
              {items.map((item) => (
                <CriterionCard key={`${item.criterion.id}-${item.review?.at ?? ""}`} item={item} lang={state.lang} pages={state.inventory} onSave={save} />
              ))}
            </section>
          );
        })}
      </main>
      <p role="status" className="review-visually-hidden">
        {announce}
      </p>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div data-theme="admin" className="seuil-root">
      <App />
    </div>
  </StrictMode>,
);
