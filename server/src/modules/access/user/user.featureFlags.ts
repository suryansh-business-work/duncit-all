// Feature flags for the user-schema refactor cutover.
//
// USER_SCHEMA_DUAL_WRITE  (default: 'true' until cutover is signed off)
//   When true, every write that touches the new nested storage ALSO mirrors
//   the value to the legacy flat field (first_name, phone_number, ...). This
//   keeps the rollback path open: dropping the new collections + $unset of
//   nested subdocs returns the system to a fully functional pre-refactor
//   state. Flip to 'false' after staging soak + production verification.
//
// USER_SCHEMA_NESTED_GRAPHQL  (default: 'false')
//   When true, the public GraphQL `User` type is served in the new nested
//   shape (auth/profile/metadata/...). For the current cutover the answer is
//   'false' — the flat GraphQL contract is preserved so 147 frontend files
//   keep working unchanged.

import { logs } from '@observability/log';

const truthy = (v: string | undefined) =>
  v !== undefined && ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

export const USER_SCHEMA_FLAGS = {
  dualWrite: truthy(process.env.USER_SCHEMA_DUAL_WRITE ?? 'true'),
  nestedGraphql: truthy(process.env.USER_SCHEMA_NESTED_GRAPHQL),
} as const;

export function logUserSchemaFlags() {
  logs.server.info('user-schema', 'logUserSchemaFlags', {
    msg: `[user-schema] dualWrite=${USER_SCHEMA_FLAGS.dualWrite} nestedGraphql=${USER_SCHEMA_FLAGS.nestedGraphql}`,
    dualWrite: USER_SCHEMA_FLAGS.dualWrite,
    nestedGraphql: USER_SCHEMA_FLAGS.nestedGraphql,
  });
}
