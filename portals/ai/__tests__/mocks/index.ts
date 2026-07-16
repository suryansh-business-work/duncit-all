/**
 * Central barrel for the AI-portal test mocks. Every spec imports its typed
 * factories + Apollo `MockedResponse` builders from here (or `../mocks/*`) —
 * never inline. All factories are typed against the generated
 * `@duncit/gql-types` schema and carry `__typename`, so the `MockedProvider`
 * cache behaves like production without `addTypename={false}`.
 */
export * from './prompt.mock';
