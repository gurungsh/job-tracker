import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      { test: { name: "server", root: "apps/server", environment: "node" } },
      { test: { name: "shared", root: "packages/shared", environment: "node" } },
      { test: { name: "client", root: "apps/client", environment: "jsdom", setupFiles: ["tests/support/setup.ts"] } },
    ],
  },
});
