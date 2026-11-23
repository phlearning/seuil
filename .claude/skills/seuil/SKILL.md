---
name: seuil
description: Audit and fix accessibility (WCAG 2.2 AA, eCH-0059), third parties and consent (nLPD) and security headers with the Seuil tools. Use when asked to audit or check a page, to fix a failing Seuil gate or its PR comment, or before shipping a UI change.
---

# Seuil fix loop

The Seuil MCP server (`.mcp.json`) gives six tools: `audit`, `check`, `findings`, `screenshot`, `report`, `review_status`. Without it, the CLI does the same: `node packages/seuil/dist/cli.js --help` (run `pnpm build` first).

## Steps

1. **Run the gate.** Serve the pages (`pnpm demos:serve` for the demos, ports 4301 to 4303), then call `check` with the project's config, such as `demos/admin/seuil.config.json`, or `audit` for a single URL. Done when you hold the grouped findings and the exit code.
2. **Look before fixing.** For each error group, call `screenshot` on one of its pages with its `element`: width 320 for reflow, 640x400 for the 200% zoom rules, `focus: true` for keyboard rules. Find the source from the snippet's text or classes. Done when you can say what the user experiences and which file causes it.
3. **Fix the cause in the source**, following the conventions below. One cause, one fix, even when it shows on several pages.
4. **Verify.** Rebuild what you changed (`pnpm --filter @seuil/tokens build`, `pnpm --filter @seuil/demo-<name> build`; preview serves the new build), take the screenshot again, then run `check` again. Loop to step 2 until `check` is green: exit code 0, every fix seen on a screenshot.
5. **Report.** List the groups fixed and how. Then call `review_status` and list the criteria still to review by a person: they stay open until a person records a verdict in `seuil review`.

## Fix conventions

- **Form fields:** `TextField`, `Select`, `Checkbox` from `@seuil/ui`, each with a visible label.
- **Information and dialogs:** an in-flow `Alert`; for a real dialog, `Modal` (native `dialog`, Escape and focus return built in).
- **Colours:** change the token in `packages/tokens/src/themes/<theme>.tokens.json`; the finding's fix gives the nearest passing hex.
- **Fonts, scripts, media:** self-hosted. A new third party is a decision for the user and the client's DPO: ask before adding it to `allowThirdParties`.
- **Audience measurement:** first-party or cookieless; anything that tracks waits for consent.
- **CSP:** stays `default-src 'self'` and strict; scripts move to files instead of loosening the policy.
- **`a11y/names` warnings** mean the accessibility tree changed: when the user confirms the change is intended, run `check` with `updateSnapshots: true`.

## Guardrails

The gate turns green by fixing pages. Rules, `failOn`, `allowThirdParties` and the verdicts in `seuil-review.json` stay as they are unless the user asks: verdicts belong to the person who signs the audit.
