import { describe, expect, it } from "vitest";
import { upsertNote } from "./gitlab-comment.js";

const env = { api: "https://gitlab.example/api/v4", project: "agence/portail", mergeRequest: "7", token: "glpat-test" };

function fakeGitlab(notes: { id: number; body: string }[]) {
  const calls: { method: string; url: string; body?: string; token: string | undefined }[] = [];
  const impl: typeof fetch = async (input, init) => {
    const method = init?.method ?? "GET";
    const headers = init?.headers as Record<string, string>;
    calls.push({ method, url: String(input), ...(init?.body ? { body: String(init.body) } : {}), token: headers["PRIVATE-TOKEN"] });
    return method === "GET" ? Response.json(notes) : Response.json({ id: 99 });
  };
  return { impl, calls };
}

describe("upsertNote", () => {
  const body = "<!-- seuil-report -->\n## Seuil";

  it("creates the note when there is none, with the token and an encoded project path", async () => {
    const { impl, calls } = fakeGitlab([{ id: 1, body: "LGTM" }]);
    expect(await upsertNote(env, body, impl)).toBe("created");
    expect(calls[1]).toMatchObject({ method: "POST", url: "https://gitlab.example/api/v4/projects/agence%2Fportail/merge_requests/7/notes", token: "glpat-test" });
  });

  it("updates the existing Seuil note instead of adding another", async () => {
    const { impl, calls } = fakeGitlab([{ id: 1, body: "LGTM" }, { id: 42, body: "<!-- seuil-report -->\nold" }]);
    expect(await upsertNote(env, body, impl)).toBe("updated");
    expect(calls[1]).toMatchObject({ method: "PUT", url: expect.stringMatching(/\/notes\/42$/) });
    expect(JSON.parse(calls[1]!.body!)).toEqual({ body });
  });
});
