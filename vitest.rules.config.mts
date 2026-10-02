import { defineConfig } from "vitest/config";

// Security rules tests. They need the Firebase emulators running, so they are
// started through `npm run test:rules` (firebase emulators:exec), not `npm test`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["rules-tests/**/*.test.ts"],
    // Both files share the same emulator data: run them one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
