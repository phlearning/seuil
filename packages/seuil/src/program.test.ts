import { describe, expect, it } from "vitest";
import { createProgram } from "./program.js";

describe("createProgram", () => {
  it("exposes the commands from the spec and the MCP server", () => {
    const names = createProgram().commands.map((c) => c.name());
    expect(names).toEqual(["tokens", "audit", "check", "review", "report", "mcp"]);
  });
});
