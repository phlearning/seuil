import { Alert, Button } from "@seuil/ui";
import { useId, useState } from "react";
import { Material } from "./Material.js";
import type { Coverage, Lang, Page, Status, Verdict } from "./types.js";

export const STATUS_LABEL: Record<Status, string> = {
  "auto-fail": "Non conforme (contrôle automatique)",
  "to-review": "À vérifier",
  "reviewed-ok": "Conforme (vérifié)",
  "reviewed-fail": "Non conforme (vérifié)",
  "not-applicable": "Non applicable",
};

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: "ok", label: "Conforme" },
  { value: "fail", label: "Non conforme" },
  { value: "na", label: "Non applicable" },
];

interface Props {
  item: Coverage;
  lang: Lang;
  pages: Page[];
  readOnly?: boolean;
  onSave(id: string, verdict: Verdict | null, comment: string): Promise<void>;
}

export function CriterionCard({ item, lang, pages, readOnly = false, onSave }: Props) {
  const { criterion: c } = item;
  const ids = useId();
  const [verdict, setVerdict] = useState<Verdict | undefined>(item.review?.verdict ?? (item.suggestNotApplicable ? "na" : undefined));
  const [comment, setComment] = useState(item.review?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(!readOnly && (item.status === "to-review" || item.status === "auto-fail"));

  const save = async (value: Verdict | null) => {
    setSaving(true);
    try {
      await onSave(c.id, value, comment);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={`review-card review-card--${item.status}`} aria-labelledby={`${ids}-title`}>
      <div className="review-card__head">
        <h3 id={`${ids}-title`} data-criterion={c.id} tabIndex={-1}>
          {c.id} {c.title[lang]}
        </h3>
        <p className="review-tags">
          <span>Niveau {c.level}</span>
          <span>{c.wcag21 ? "eCH-0059" : "Nouveau en WCAG 2.2"}</span>
          <strong className={`review-status review-status--${item.status}`}>{STATUS_LABEL[item.status]}</strong>
        </p>
        <button type="button" className="review-toggle" aria-expanded={open} aria-controls={`${ids}-body`} onClick={() => setOpen(!open)}>
          {open ? "Replier" : "Déplier"}
          <span className="review-visually-hidden"> le critère {c.id}</span>
        </button>
      </div>

      <div id={`${ids}-body`} hidden={!open}>
        <p className="review-checklist">{c.checklist[lang]}</p>

        <p className="review-muted">
          Contrôles automatiques : {item.checksRun.length > 0 ? item.checksRun.join(", ") : "aucun pour ce critère"}.
        </p>

        {item.failures.length > 0 && (
          <Alert title={`${item.failures.length} défaut(s) détecté(s) automatiquement`} tone="error">
            <ul>
              {item.failures.slice(0, 5).map((f, i) => (
                <li key={i}>
                  <code>{[f.target.theme && `[${f.target.theme}]`, f.target.id, f.target.selector].filter(Boolean).join(" ")}</code> : {f.message}
                </li>
              ))}
            </ul>
            <p>Corrigez ces défauts puis relancez seuil check : un critère en échec automatique ne peut pas être validé à la main.</p>
          </Alert>
        )}
        {item.warnings.length > 0 && (
          <Alert title={`${item.warnings.length} point(s) à examiner`}>
            <ul>
              {item.warnings.slice(0, 5).map((f, i) => (
                <li key={i}>{f.message}</li>
              ))}
            </ul>
          </Alert>
        )}
        {item.stalePages.length > 0 && item.review && (
          <Alert title="Revue à refaire">Page(s) modifiée(s) depuis la revue du {new Date(item.review.at).toLocaleDateString("fr-CH")} : {item.stalePages.join(", ")}.</Alert>
        )}
        {item.suggestNotApplicable && item.status === "to-review" && <p className="review-muted">Suggestion : aucune page auditée n'est concernée, le critère est probablement non applicable.</p>}

        <Material id={c.id} pages={pages} />

        {readOnly && item.review && (
          <p className="review-verdict">
            <strong>Verdict :</strong> {item.review.comment || "sans commentaire"}
          </p>
        )}
        {!readOnly && item.status !== "auto-fail" && (
          <form
            className="review-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (verdict) void save(verdict);
            }}
          >
            <fieldset>
              <legend>Votre verdict pour {c.id}</legend>
              {VERDICTS.map((v) => (
                <label key={v.value} className="review-radio">
                  <input type="radio" name={`${ids}-verdict`} value={v.value} checked={verdict === v.value} onChange={() => setVerdict(v.value)} />
                  {v.label}
                </label>
              ))}
            </fieldset>
            <div className="seuil-field">
              <label className="seuil-field__label" htmlFor={`${ids}-comment`}>
                Commentaire (constat, pages vérifiées, outil utilisé)
              </label>
              <textarea id={`${ids}-comment`} className="seuil-field__input review-textarea" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </div>
            <div className="review-actions">
              <Button type="submit" disabled={!verdict || saving}>
                {saving ? "Enregistrement..." : "Enregistrer le verdict"}
              </Button>
              {item.review && (
                <Button variant="secondary" disabled={saving} onClick={() => void save(null)}>
                  Effacer
                </Button>
              )}
            </div>
            {item.review && (
              <p className="review-muted">
                Dernière revue : {item.review.reviewer}, le {new Date(item.review.at).toLocaleString("fr-CH")}.
              </p>
            )}
          </form>
        )}
      </div>
    </article>
  );
}
