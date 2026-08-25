import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // The Raycast runtime is not available under vitest; tests stub what they touch
    alias: { "@raycast/api": new URL("src/test/raycast-stub.ts", import.meta.url).pathname },
  },
});
