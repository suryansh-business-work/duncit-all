/**
 * Central barrel for the challenge-portal test mocks. Every spec imports its
 * typed factories + Apollo `MockedResponse` builders from here (or a specific
 * `../mocks/<domain>.mock` file) — never inline. All factories are typed
 * against the generated `@duncit/gql-types` schema and carry `__typename`, so
 * the `MockedProvider` cache behaves like production without `addTypename`.
 */
export * from './challenge.mock';
export * from './category.mock';
