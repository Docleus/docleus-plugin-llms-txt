import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "shared/index": "src/shared/index.ts",
    "server/index": "src/server/index.ts",
  },
  format: "esm",
  dts: false,
  outExtensions: () => ({ js: ".js" }),
  clean: true,
});
