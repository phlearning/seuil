/**
 * Creates or updates the Seuil note on a GitLab merge request (used by gitlab/seuil.gitlab-ci.yml).
 * Needs SEUIL_GITLAB_TOKEN (project access token, "api" scope) and GitLab's predefined CI variables.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface GitlabEnv {
  api: string;
  project: string;
  mergeRequest: string;
  token: string;
}

export async function upsertNote(env: GitlabEnv, body: string, fetchImpl: typeof fetch = fetch): Promise<"created" | "updated"> {
  const marker = body.split("\n", 1)[0] ?? "";
  const base = `${env.api}/projects/${encodeURIComponent(env.project)}/merge_requests/${env.mergeRequest}/notes`;
  const headers = { "PRIVATE-TOKEN": env.token, "content-type": "application/json" };

  const list = await fetchImpl(`${base}?per_page=100&sort=asc`, { headers });
  if (!list.ok) throw new Error(`GitLab answered ${list.status} when listing notes`);
  const existing = ((await list.json()) as { id: number; body: string }[]).find((n) => n.body.startsWith(marker));

  const response = existing
    ? await fetchImpl(`${base}/${existing.id}`, { method: "PUT", headers, body: JSON.stringify({ body }) })
    : await fetchImpl(base, { method: "POST", headers, body: JSON.stringify({ body }) });
  if (!response.ok) throw new Error(`GitLab answered ${response.status} when saving the note`);
  return existing ? "updated" : "created";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { CI_API_V4_URL, CI_PROJECT_ID, CI_MERGE_REQUEST_IID, SEUIL_GITLAB_TOKEN } = process.env;
  if (!CI_API_V4_URL || !CI_PROJECT_ID || !CI_MERGE_REQUEST_IID || !SEUIL_GITLAB_TOKEN) {
    console.error("Missing CI_API_V4_URL, CI_PROJECT_ID, CI_MERGE_REQUEST_IID or SEUIL_GITLAB_TOKEN.");
    process.exit(2);
  }
  const outcome = await upsertNote(
    { api: CI_API_V4_URL, project: CI_PROJECT_ID, mergeRequest: CI_MERGE_REQUEST_IID, token: SEUIL_GITLAB_TOKEN },
    readFileSync(process.argv[2] ?? "seuil-report/comment.md", "utf8"),
  );
  console.log(`Merge request note ${outcome}.`);
}
