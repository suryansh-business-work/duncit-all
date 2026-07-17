/**
 * Central barrel for the tech-portal test mocks. Every spec imports its typed
 * factories + Apollo `MockedResponse` builders from here (or a specific
 * `../mocks/<domain>.mock` file) — never inline. Entity factories are typed
 * against the generated `@duncit/gql-types` schema (or the portal's own
 * schema-projection interfaces) and carry `__typename`, so the `MockedProvider`
 * cache behaves like production without the `addTypename` escape hatch.
 */
export * from './feature-flag.mock';
export * from './portal-mode.mock';
export * from './server.mock';
export * from './email-template.mock';
export * from './env-entry.mock';
export * from './auth.mock';
