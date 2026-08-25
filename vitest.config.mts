import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // The Raycast runtime is not available under vitest; tests stub what they touch
    alias: { "@raycast/api": resolve(__dirname, "src/test/raycast-stub.ts") },
  },
});
