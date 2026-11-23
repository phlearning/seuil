import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveDirectory, type StaticServer } from "../audit/serve.js";
import { page } from "../audit/testing.js";
import { createSeuilServer } from "./server.js";

let dir: string;
let site: StaticServer;
let client: Client;

type Content = { type: string; text?: string; data?: string; mimeType?: string }[];
const call = async (name: string, args: Record<string, unknown>) => {
  const result = (await client.callTool({ name, arguments: args })) as { content: Content; isError?: boolean };
  const text = result.content.find((c) => c.type === "text")?.text ?? "";
  return { ...result, text, data: (() => { try { return JSON.parse(text); } catch { return undefined; } })() };
};

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "seuil-mcp-"));
  mkdirSync(join(dir, "site"));
  writeFileSync(join(dir, "site", "index.html"), page(`<h1>Rendez-vous</h1><input id="allergies" placeholder="Allergies connues"><button>Envoyer</button>`));
  site = await serveDirectory(join(dir, "site"));
  writeFileSync(join(dir, "seuil.config.json"), JSON.stringify({ targets: [`${site.url}/`], offline: true }));

  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createSeuilServer(dir).connect(serverSide);
  client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientSide);
});
afterAll(async () => {
  await client.close();
  await site.close();
});

describe("seuil MCP server", () => {
  it("lists its six tools with descriptions", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["audit", "check", "findings", "report", "review_status", "screenshot"]);
    expect(tools.every((t) => (t.description ?? "").length > 40)).toBe(true);
  });

  it("audits a URL and returns grouped findings with the element and the fix", async () => {
    const { data } = await call("audit", { target: `${site.url}/`, rules: ["a11y/labels"] });
    expect(data.errors).toBe(1);
    expect(data.findings[0]).toMatchObject({ rule: "a11y/labels", element: "#allergies", pages: [`${site.url}/`] });
    expect(data.findings[0].fix).toContain("label");
  });

  it("returns a screenshot with the element outlined", async () => {
    const result = await call("screenshot", { url: `${site.url}/`, selector: "#allergies", width: 640, height: 400 });
    const image = result.content.find((c) => c.type === "image");
    expect(image?.mimeType).toBe("image/png");
    expect(Buffer.from(image!.data!, "base64").subarray(1, 4).toString()).toBe("PNG");
    expect(result.text).toContain("outlined");
  });

  it("explains what to do when there are no results yet", async () => {
    const result = await call("findings", { results: "nope.json" });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("run the check tool first");
  });

  it("runs the check, then reads findings and the review status from the results", async () => {
    const check = await call("check", {});
    expect(check.data.exitCode).toBe(1);
    const findings = await call("findings", { rule: "a11y/labels" });
    expect(findings.data.total).toBe(1);
    const review = await call("review_status", {});
    expect(review.data.summary.total).toBe(55);
    expect(review.data.toReview[0]).toHaveProperty("checklist");
  });

  it("renders the pull request comment as text", async () => {
    const result = await call("report", { format: "md" });
    expect(result.text).toContain("<!-- seuil-report -->");
  });
});
