/**
 * Central barrel for the support-portal test mocks. Every spec imports its
 * typed factories + Apollo `MockedResponse` builders from here (or a specific
 * `../mocks/<domain>.mock` file) — never inline. All factories are typed
 * against the generated `@duncit/gql-types` schema and carry `__typename`, so
 * the `MockedProvider` cache behaves like production without `addTypename`.
 */
export * from './common.mock';
export * from './sos.mock';
export * from './callback.mock';
export * from './ticket.mock';
export * from './supportChat.mock';
export * from './dashboard.mock';
export * from './auth.mock';
export * from './upload.mock';
