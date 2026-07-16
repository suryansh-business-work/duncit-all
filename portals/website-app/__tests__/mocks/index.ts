/**
 * Central barrel for the website-portal test mocks. Every spec imports its typed
 * factories + Apollo `MockedResponse` builders from here (or a specific
 * `../mocks/<domain>.mock` file) — never inline. All factories are typed against
 * the generated `@duncit/gql-types` schema and carry `__typename`, so the
 * `MockedProvider` cache behaves like production without `addTypename={false}`.
 */
export * from './table';
export * from './branding.mock';
export * from './appSettings.mock';
export * from './auth.mock';
export * from './jobApplication.mock';
export * from './contact.mock';
export * from './faq.mock';
export * from './newsletter.mock';
export * from './navigation.mock';
export * from './content.mock';
export * from './dashboard.mock';
