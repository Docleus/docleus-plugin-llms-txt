import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLUGIN_NAME } from "./index.ts";

function read(file: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"),
  );
}

describe("package", () => {
  it("names the plugin like its manifest and package.json", () => {
    expect(read("docleus.plugin.json")).toMatchObject({ name: PLUGIN_NAME });
    expect(read("package.json")).toMatchObject({ name: PLUGIN_NAME });
  });

  it("has server and shared entries only", () => {
    const manifest = read("docleus.plugin.json") as { entries: unknown };
    expect(manifest.entries).toEqual({
      shared: "./dist/shared/index.js",
      server: "./dist/server/index.js",
    });
  });
});
