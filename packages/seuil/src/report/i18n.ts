import type { CriterionStatus } from "../results.js";
import type { Lang } from "../review/criteria.js";
import type { CoverageSummary } from "../review/coverage.js";

export interface Strings {
  title: string;
  client: string;
  date: string;
  tool: string;
  summary: string;
  verdict: Record<CoverageSummary["verdict"], string>;
  coverageLine: (s: CoverageSummary) => string;
  ech: string;
  echVerdict: Record<CoverageSummary["verdict"], string>;
  scope: string;
  pages: string;
  rulesRun: string;
  standards: string;
  wcagTable: string;
  criterion: string;
  level: string;
  inEch: string;
  status: string;
  detail: string;
  statuses: Record<CriterionStatus, string>;
  yes: string;
  no: string;
  autoFailures: (n: number) => string;
  changedPages: (pages: string[]) => string;
  suggestedNa: string;
  accessibility: string;
  privacy: string;
  security: string;
  noFinding: string;
  register: string;
  registerCols: string[];
  unknownProvider: string;
  where: string;
  fix: string;
  severity: { error: string; warning: string };
  ruleCol: string;
  method: string;
  methodText: string[];
  limits: string;
  limitsText: string[];
  attribution: string;
  errorsWarnings: (e: number, w: number) => string;
  incomplete: (n: number) => string;
  prTitle: string;
  prMore: (n: number) => string;
}

const fr: Strings = {
  title: "Rapport d'audit de conformité",
  client: "Client",
  date: "Date",
  tool: "Outil",
  summary: "Synthèse",
  verdict: { compliant: "Conforme", "non-compliant": "Non conforme", incomplete: "Audit incomplet" },
  coverageLine: (s) => `${s.resolved} critères sur ${s.total} évalués (${s.percent} %), ${s.failed} non conforme(s).`,
  ech: "eCH-0059 v3.0 (WCAG 2.1 AA)",
  echVerdict: { compliant: "Conforme", "non-compliant": "Non conforme", incomplete: "Évaluation incomplète" },
  scope: "Périmètre",
  pages: "Pages auditées",
  rulesRun: "Contrôles automatiques exécutés",
  standards: "Référentiels : WCAG 2.2 niveaux A et AA, eCH-0059 v3.0, nLPD (RS 235.1), LTC art. 45c.",
  wcagTable: "Couverture des critères WCAG 2.2 A et AA",
  criterion: "Critère",
  level: "Niveau",
  inEch: "eCH-0059",
  status: "Statut",
  detail: "Détail",
  statuses: {
    "auto-fail": "Non conforme (contrôle automatique)",
    "to-review": "À vérifier",
    "reviewed-ok": "Conforme (vérifié)",
    "reviewed-fail": "Non conforme (vérifié)",
    "not-applicable": "Non applicable",
  },
  yes: "oui",
  no: "non",
  autoFailures: (n) => `${n} défaut(s) détecté(s) automatiquement.`,
  changedPages: (p) => `Revue à refaire : page(s) modifiée(s) depuis (${p.join(", ")}).`,
  suggestedNa: "Probablement non applicable : aucune page auditée n'est concernée.",
  accessibility: "Accessibilité : défauts détectés",
  privacy: "Protection des données",
  security: "Sécurité",
  noFinding: "Aucun défaut détecté.",
  register: "Registre des flux de données vers des tiers",
  registerCols: ["Page", "Hôte", "Fournisseur", "Société (pays)", "Serveur", "Au chargement", "Déclaré", "nLPD"],
  unknownProvider: "inconnu",
  where: "Emplacement",
  fix: "Correction",
  severity: { error: "Erreur", warning: "Avertissement" },
  ruleCol: "Règle",
  method: "Méthode",
  methodText: [
    "Contrôles automatiques dans un navigateur Chromium réel : axe-core (règles WCAG A et AA), parcours au clavier, redistribution à 320 px, zoom à 200 %, espacement du texte, animations, taille des cibles, arbre d'accessibilité.",
    "Contraste vérifié dès les design tokens, pour chaque thème.",
    "Requêtes réseau observées au chargement, sans aucune interaction : aucun consentement n'est donné.",
    "Les critères qu'aucune machine ne peut juger sont vérifiés par une personne lors d'un audit guidé, consigné dans seuil-review.json.",
  ],
  limits: "Limites",
  limitsText: [
    "Les contrôles automatiques ne couvrent qu'une partie de chaque critère : aucun critère n'est déclaré conforme sur leur seule base.",
    "Le volet protection des données est un constat technique documenté, pas un avis juridique. Le registre est à compléter et valider par la personne responsable de la protection des données.",
    "La conformité eCH-0059 est évaluée sur les critères WCAG 2.1 AA qu'elle reprend ; vérifier ses exigences complémentaires éventuelles.",
  ],
  attribution: "Localisation des serveurs : IP Geolocation by DB-IP (https://db-ip.com), licence CC BY 4.0.",
  errorsWarnings: (e, w) => `${e} erreur(s), ${w} avertissement(s)`,
  incomplete: (n) => `${n} contrôle(s) n'ont pas pu s'exécuter : résultats incomplets.`,
  prTitle: "Seuil : contrôle de conformité",
  prMore: (n) => `... et ${n} autre(s). Détail dans seuil-results.json.`,
};

const en: Strings = {
  title: "Compliance audit report",
  client: "Client",
  date: "Date",
  tool: "Tool",
  summary: "Summary",
  verdict: { compliant: "Compliant", "non-compliant": "Not compliant", incomplete: "Audit incomplete" },
  coverageLine: (s) => `${s.resolved} of ${s.total} criteria assessed (${s.percent}%), ${s.failed} failing.`,
  ech: "eCH-0059 v3.0 (WCAG 2.1 AA)",
  echVerdict: { compliant: "Compliant", "non-compliant": "Not compliant", incomplete: "Assessment incomplete" },
  scope: "Scope",
  pages: "Audited pages",
  rulesRun: "Automated checks run",
  standards: "Standards: WCAG 2.2 levels A and AA, eCH-0059 v3.0, Swiss FADP (SR 235.1), TCA art. 45c.",
  wcagTable: "WCAG 2.2 A and AA coverage",
  criterion: "Criterion",
  level: "Level",
  inEch: "eCH-0059",
  status: "Status",
  detail: "Detail",
  statuses: {
    "auto-fail": "Fails (automated check)",
    "to-review": "To review",
    "reviewed-ok": "Passes (reviewed)",
    "reviewed-fail": "Fails (reviewed)",
    "not-applicable": "Not applicable",
  },
  yes: "yes",
  no: "no",
  autoFailures: (n) => `${n} defect(s) found automatically.`,
  changedPages: (p) => `Review again: page(s) changed since (${p.join(", ")}).`,
  suggestedNa: "Probably not applicable: no audited page is concerned.",
  accessibility: "Accessibility: defects found",
  privacy: "Data protection",
  security: "Security",
  noFinding: "No defect found.",
  register: "Register of data flows to third parties",
  registerCols: ["Page", "Host", "Provider", "Company (country)", "Server", "On load", "Declared", "FADP"],
  unknownProvider: "unknown",
  where: "Location",
  fix: "Fix",
  severity: { error: "Error", warning: "Warning" },
  ruleCol: "Rule",
  method: "Method",
  methodText: [
    "Automated checks in a real Chromium browser: axe-core (WCAG A and AA rules), keyboard walk, reflow at 320 px, 200% zoom, text spacing, motion, target size, accessibility tree.",
    "Contrast checked in the design tokens, for every theme.",
    "Network requests observed on page load, without any interaction: no consent is given.",
    "Criteria no machine can judge are checked by a person in a guided review, recorded in seuil-review.json.",
  ],
  limits: "Limits",
  limitsText: [
    "Automated checks cover only part of each criterion: no criterion is declared compliant on their basis alone.",
    "The data protection part is a documented technical finding, not legal advice. The register must be completed and validated by the data protection officer.",
    "eCH-0059 compliance is assessed on the WCAG 2.1 AA criteria it incorporates; check any additional requirements.",
  ],
  attribution: "Server location: IP Geolocation by DB-IP (https://db-ip.com), CC BY 4.0.",
  errorsWarnings: (e, w) => `${e} error(s), ${w} warning(s)`,
  incomplete: (n) => `${n} check(s) could not run: results are incomplete.`,
  prTitle: "Seuil: compliance check",
  prMore: (n) => `... and ${n} more. Details in seuil-results.json.`,
};

export const STRINGS: Record<Lang, Strings> = { fr, en };
