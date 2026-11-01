import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  fixedExtension: false,
  platform: "node",
  target: "es2022",
  clean: true,
  sourcemap: true,
  dts: {
    resolve: [/^@waesim\//],
  },
  deps: {
    alwaysBundle: [/^@waesim\//],
    neverBundle: [/^effect(\/|$)/, /^@effect\//],
  },
})
