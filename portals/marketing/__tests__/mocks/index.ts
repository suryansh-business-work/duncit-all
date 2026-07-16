/**
 * Central barrel for the marketing-portal test mocks. Every spec imports its
 * typed factories + Apollo `MockedResponse` builders from here (or a specific
 * `../mocks/<domain>.mock` file) — never inline. Factories are typed against
 * the generated `@duncit/gql-types` schema (or the app-level row projections)
 * and carry `__typename`, so the `MockedProvider` cache behaves like production
 * without `addTypename`.
 */
export * from './ads.mock';
export * from './campaigns.mock';
export * from './notifications.mock';
export * from './mjml.mock';
