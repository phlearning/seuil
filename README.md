# Seuil

> Nothing crosses the threshold unless it complies.

[Version française](README.fr.md)

Seuil is a compliance gate for agencies that ship web products to regulated clients (health, public administration, energy). It plugs into the delivery chain, from design tokens to deployed pages, and blocks a pull request until accessibility, data protection and security checks pass. It then produces an audit report the agency can hand to its client as is.

**Status: week 3 of 5.** `seuil tokens`, `seuil audit` and `seuil check` work: accessibility, third parties and consent, data-flow register, security headers and dependencies. The guided audit, reports and CI integrations come next. See [docs/SPEC.md](docs/SPEC.md) (in French) for the full specification and the 5-week plan.

```bash
$ seuil tokens
ERROR  tokens/contrast  [WCAG 2.2 1.4.3]
  color.text.muted on color.bg.default in theme "admin": contrast 3.45:1, below the 4.5:1 required for normal text.
  Fix: Use #757575 or darker for color.text.muted (same hue, reaches 4.5:1).
```

## What it checks

- **Contrast in the design tokens**, before any code is written (WCAG 2.2, 1.4.3 and 1.4.11).
- **Accessibility of rendered pages and Storybook stories**: axe-core, keyboard navigation, reflow, text spacing, reduced motion, target size, accessible names. The reference is WCAG 2.2 AA, which covers eCH-0059 v3.0 (WCAG 2.1 AA).
- **A guided manual audit** for the criteria no machine can judge, so the report covers 100% of WCAG 2.2 AA criteria.
- **Third parties and data protection (Swiss nLPD)**: every external request, cookies set before consent, server country and provider jurisdiction, exported as a data-flow register for the client's DPO (data protection officer).
- **Security**: HTTP headers, CSP analysis, vulnerable dependencies (OSV).

Seuil reports technical facts. It is not legal advice, and automated checks alone never replace a human audit, which is why the guided audit exists.

## Layout

| Path | Content |
|---|---|
| `packages/seuil` | The CLI, the core of the project |
| `packages/tokens` | DTCG design tokens with three client themes |
| `packages/ui` | React components and Storybook |
| `packages/review` | Local UI for the guided audit |
| `data/` | Third-party provider list, WCAG reference data |
| `demos/` | Three fictional clients: health, administration, energy |
| `action/`, `gitlab/` | GitHub Action and GitLab CI template |
| `site/` | Static showcase for GitHub Pages |

## Development

Requires Node 22 or later and pnpm 12.

```bash
pnpm install
pnpm test
pnpm build
node packages/seuil/dist/cli.js --help
pnpm audit:storybook   # Seuil audits its own Storybook
pnpm geoip             # once a month: DB-IP Lite country database (CC BY 4.0)
pnpm demos:serve       # the three fictional clients on ports 4301-4303 (keep running)
pnpm check             # tokens, Storybook, demo pages and dependencies -> seuil-results.json
```

Accessibility tree snapshots live in `.seuil/snapshots` and are committed. After an intended change, accept it with `seuil audit <target> --update-snapshots`.

## Data sovereignty

The tool sends no data anywhere, except the optional OSV vulnerability lookup (lockfile contents only, can be disabled with `"offline": true`). It can run entirely on the client's own infrastructure, including self-hosted GitLab.
