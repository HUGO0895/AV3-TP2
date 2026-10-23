const { createDefaultPreset } = require("ts-jest");

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: { ...createDefaultPreset().transform },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/Entidades/**",
    "!src/migration/**",
    "!src/Repositorio/**",
    "!src/ConecBanco.ts",
    "!src/app.ts",
    "!src/__tests__/**",
  ],
  coverageThreshold: { global: { statements: 80, branches: 70, functions: 80, lines: 80 } },
};
