/**
 * Central barrel for the employee-portal test mocks. Every spec imports its
 * typed factories from here (or a specific `../mocks/<entity>.mock` file) —
 * never inline. All factories are typed against the generated `@duncit/gql-types`
 * schema and carry `__typename`, so the `MockedProvider` cache behaves like
 * production without the deprecated `addTypename={false}` escape hatch.
 */
export * from './user.mock';
