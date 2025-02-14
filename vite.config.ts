import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      // This tells vitest to include those files from src/lib in test coverage
      // as well that don't have an associated test written for them.
      all: true,
      // This tells vitests the directory to get coverage for.
      include: ["src/lib"],
      // This tells vitest to exclude files from src/lib directory from the coverage.
      // This is intentionally done because these files don't provide any meaningful
      // coverage in test coverage report.
      exclude: [
        "src/lib/config",
        "src/lib/directives/index.ts",
        "src/lib/libraries/**/*index.ts",
        "src/lib/middleware/index.ts",
        "src/lib/models",
        "src/lib/resolvers/**/*index.ts",
        "src/lib/typeDefs",
        "src/lib/utilities/index.ts",
      ],
      // This is used to tell vitest which coverage provider to use. c8 is the default
      // and newer coverage provider for node.js applications. You can swap it with
      // istanbul as well.
      provider: "c8",
      // This tells vitest in what format the report will be generated. Here lcov
      // is selected because a file named lcov.info is generated by this reporter which
      // is used in codecov/codecov-action github action.
      reporter: ["lcov"],
    },
    // Tells vitest the time limit for an individual test block run.
    testTimeout: 30000,
  },
});
