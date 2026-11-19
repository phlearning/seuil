import type { Page } from "playwright";
import type { DataFlow, Finding, PageInventory } from "../results.js";
import type { GeoLookup } from "../privacy/geo.js";
import type { Provider } from "../privacy/providers.js";

export interface AuditTarget {
  /** Storybook story id, or the URL for a plain page. */
  id: string;
  url: string;
  kind: "component" | "page";
  theme?: string;
  /** CSS selector of the area under test (the story root in Storybook). */
  root?: string;
}

export interface RuleContext {
  /** Folder for accessibility tree snapshots (a11y/names). */
  snapshotsDir: string;
  updateSnapshots: boolean;
  /** Hosts treated as first party, besides the target's own host. */
  firstParty: string[];
  /** Third-party hosts or provider ids the agency has reviewed and accepted. */
  allowThirdParties: string[];
  providers: Provider[];
  geo: GeoLookup;
  /** Collects data flows for the register (privacy rules). */
  recordFlow(flow: DataFlow): void;
  /** Collects page inventories for the guided review; absent when not needed. */
  recordInventory?(inventory: PageInventory): void;
  /** Where page screenshots for the review are saved; none when absent. */
  screenshotsDir?: string;
}

export interface Rule {
  id: string;
  /** Opens its own page state (viewport, media) and returns its findings. */
  run(page: Page, target: AuditTarget, context: RuleContext): Promise<Finding[]>;
}
