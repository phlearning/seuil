# Seuil

> Nothing crosses the threshold unless it complies.

[Version française](README.fr.md)

Seuil is a compliance gate for agencies that ship web products to regulated clients (health, public administration, energy). It plugs into the delivery chain, from design tokens to deployed pages, and blocks a pull request until accessibility, data protection and security checks pass. It then produces an audit report the agency can hand to its client as is.

**Status: complete (week 5 of 5).** Every command works (`tokens`, `audit`, `check`, `review`, `report`), with a Docker image, a GitHub Action, a GitLab CI template and a static showcase. See [docs/SPEC.md](docs/SPEC.md) (in French) for the full specification and the 5-week plan.

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

The health demo has a complete guided review (`demos/sante/seuil-review.json`, 55/55 criteria):

```bash
cd demos/sante
node ../../packages/seuil/dist/cli.js check          # needs pnpm demos:serve running
node ../../packages/seuil/dist/cli.js review         # local UI on http://127.0.0.1:4310
node ../../packages/seuil/dist/cli.js report --client "Clinique des Aubépines" -o seuil-report/rapport.html
```

Accessibility tree snapshots live in `.seuil/snapshots` and are committed. After an intended change, accept it with `seuil audit <target> --update-snapshots`.

## Use it in CI

GitHub Actions (one comment per project on the pull request, reports as artifacts):

```yaml
- uses: phlearning/seuil/action@main
  with:
    working-directory: demos/sante
    client: Clinique des Aubépines
```

GitLab CI, including self-hosted GitLab:

```yaml
include:
  - remote: https://raw.githubusercontent.com/phlearning/seuil/main/gitlab/seuil.gitlab-ci.yml
```

Anywhere with Docker (headless Chromium, data and DB-IP Lite included):

```bash
docker run --rm -v "$PWD:/work" ghcr.io/phlearning/seuil check
```

## Demo pull requests

Each fictional client gets the same feature twice: a red pull request that Seuil blocks, and a green one that passes.

| Client | Feature | Red branch, blocked for | Green branch |
|---|---|---|---|
| Clinique des Aubépines | Pre-visit questionnaire | `demo/sante-questionnaire-rouge`: keyboard trap, fields labelled only by placeholders | `demo/sante-questionnaire` |
| Commune de Valfleurie | New brand | `demo/admin-charte-rouge`: Google Fonts (transfer to the US), low-contrast token, fixed-width form | `demo/admin-charte` |
| Cascade Énergie | Audience measurement | `demo/energie-audience-rouge`: Google Analytics before consent, CSP removed, vulnerable lodash | `demo/energie-audience` |

`pnpm showcase` builds the static site (live demos, client reports, read-only guided reviews, Storybook) into `site/dist`; `.github/workflows/pages.yml` publishes it.

## Data sovereignty

The tool sends no data anywhere, except the optional OSV vulnerability lookup (lockfile contents only, can be disabled with `"offline": true`). It can run entirely on the client's own infrastructure, including self-hosted GitLab.

## License

MIT, see [LICENSE](LICENSE). Server location data: IP Geolocation by DB-IP (https://db-ip.com), CC BY 4.0.
