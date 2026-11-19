import type { Page } from "playwright";
import type { Finding } from "../results.js";

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
}

export interface Rule {
  id: string;
  /** Opens its own page state (viewport, media) and returns its findings. */
  run(page: Page, target: AuditTarget, context: RuleContext): Promise<Finding[]>;
}
