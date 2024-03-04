const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // ts-jest configuration goes here
      },
    ],
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>",
  }),
  testPathIgnorePatterns: [
    "<rootDir>/__tests__/config",
    "<rootDir>/node_modules",
  ],
  globalSetup: "<rootDir>/__tests__/config/globalSetup.ts",
  globalTeardown: "<rootDir>/__tests__/config/globalTeardown.ts",
  setupFilesAfterEnv: ["<rootDir>/__tests__/config/setupFile.ts"],
};
