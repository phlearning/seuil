<!-- seuil-report:energie -->
## ❌ Seuil : contrôle de conformité (energie)

**23 erreur(s), 5 avertissement(s)** · WCAG 2.2 AA : 0 critères sur 55 évalués (0 %), 0 non conforme(s).

| Règle | Emplacement | Description | Correction |
|---|---|---|---|
| <code>privacy/consent</code> | <code>cookie _ga</code><br>3 pages : /consommation.html, /plan-du-site.html, / | Tracking cookie "_ga" is set before the visitor could make any choice. | Set it only after consent, or not at all. |
| <code>privacy/consent</code> | <code>cookie _ga_DEMO000000</code><br>3 pages : /consommation.html, /plan-du-site.html, / | Tracking cookie "_ga_DEMO000000" is set before the visitor could make any choice. | Set it only after consent, or not at all. |
| <code>privacy/consent</code> | <code>www.google-analytics.com</code><br>3 pages : /consommation.html, /plan-du-site.html, / | Google Analytics (analytics) is contacted on page load, before the visitor could make any choice. | Load it only after an explicit choice in a consent banner, or use a cookieless, self-hosted alternative. |
| <code>privacy/consent</code> | <code>www.googletagmanager.com</code><br>3 pages : /consommation.html, /plan-du-site.html, / | Google Tag Manager (tag-manager) is contacted on page load, before the visitor could make any choice. | Load it only after an explicit choice in a consent banner, or use a cookieless, self-hosted alternative. |
| <code>privacy/third-parties</code> | <code>www.google-analytics.com</code><br>3 pages : /consommation.html, /plan-du-site.html, / | Undeclared third party www.google-analytics.com: Google Analytics (Google LLC, US, US CLOUD Act), server in US. Every visitor's IP address is sent to it on page load. | Remove it, self-host it, or once reviewed with the DPO add it to allowThirdParties. |
| <code>privacy/third-parties</code> | <code>www.googletagmanager.com</code><br>3 pages : /consommation.html, /plan-du-site.html, / | Undeclared third party www.googletagmanager.com: Google Tag Manager (Google LLC, US, US CLOUD Act), server in US. Every visitor's IP address is sent to it on page load. | Remove it, self-host it, or once reviewed with the DPO add it to allowThirdParties. |
| <code>security/headers</code> | <code>content-security-policy</code><br>3 pages : /consommation.html, /plan-du-site.html, / | No Content-Security-Policy: an injected script runs with full access to the page and its forms. | Send a CSP such as: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'. |
| <code>security/deps</code> | <code>pnpm-lock.yaml</code><br>page lodash@4.17.20 | lodash@4.17.20: Command Injection in lodash (GHSA-35jh-r3h4-6jhm, CVE-2021-23337, high). | Upgrade lodash to 4.17.21 or later. |
| <code>security/deps</code> | <code>pnpm-lock.yaml</code><br>page lodash@4.17.20 | lodash@4.17.20: lodash vulnerable to Code Injection via `_.template` imports key names (GHSA-r5fr-rjxr-66jc, CVE-2026-4800, high). | Upgrade lodash to 4.18.0 or later. |

<details>
<summary>Voir les 5 avertissement(s)</summary>

| Règle | Emplacement | Description | Correction |
|---|---|---|---|
| <code>a11y/names</code> | <code>http://127.0.0.1:4303/consommation.html</code> | Accessibility tree changed since the reference snapshot (roles or accessible names): + - row "Total 1573": + - rowheader "Total" + - cell "1573" | If the change is intended, run seuil audit --update-snapshots and commit the new snapshot. |
| <code>security/deps</code> | <code>pnpm-lock.yaml</code><br>page glob@13.0.7 | glob@13.0.7: Glob: AbortSignal cancellation bypass allows post-timeout filesystem traversal (GHSA-3g3m-2fjr-6pw4, CVE-2026-118773, moderate). | Upgrade glob to 14.0.2 or later. |
| <code>security/deps</code> | <code>pnpm-lock.yaml</code><br>page lodash@4.17.20 | lodash@4.17.20: Regular Expression Denial of Service (ReDoS) in lodash (GHSA-29mw-wpgm-hmr9, CVE-2020-28500, moderate). | Upgrade lodash to 4.17.21 or later. |
| <code>security/deps</code> | <code>pnpm-lock.yaml</code><br>page lodash@4.17.20 | lodash@4.17.20: Lodash has Prototype Pollution Vulnerability in `_.unset`, `_.omit`, and `_.pullAt` functions (GHSA-xxjr-mmjv-4gpg, CVE-2025-13465, moderate). | Upgrade lodash to 4.17.23 or later. |
| <code>security/deps</code> | <code>pnpm-lock.yaml</code><br>page minimatch@10.2.6 | minimatch@10.2.6: minimatch has potential denial of service via globparts amplification (GHSA-g3hv-75wg-m249, CVE-2026-118764, moderate). | Upgrade minimatch to 11.0.1 or later. |

</details>

