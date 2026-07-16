/**
 * Central barrel for the finance-portal test mocks. Every spec imports its typed
 * factories + Apollo `MockedResponse` builders from here (or a specific
 * `../mocks/<domain>.mock` file) — never inline. All factories are typed against
 * the generated `@duncit/gql-types` schema and carry `__typename`, so the
 * `MockedProvider` cache behaves like production without `addTypename`.
 */
export * from './dashboard.mock';
export * from './deductions.mock';
export * from './invoice.mock';
export * from './invoice-template.mock';
export * from './payout-cycles.mock';
export * from './backout.mock';
export * from './expense.mock';
export * from './payment-logs.mock';
export * from './payment-release.mock';
export * from './pod-finance.mock';
export * from './withdrawals.mock';
export * from './startup.mock';
