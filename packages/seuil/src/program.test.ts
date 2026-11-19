import { describe, expect, it } from "vitest";
import { createProgram } from "./program.js";

describe("createProgram", () => {
  it("exposes the five commands from the spec", () => {
    const names = createProgram().commands.map((c) => c.name());
    expect(names).toEqual(["tokens", "audit", "check", "review", "report"]);
  });
});
