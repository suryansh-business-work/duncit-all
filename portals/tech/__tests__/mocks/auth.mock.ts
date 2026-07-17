import type { AppSettings } from '@duncit/gql-types';

/**
 * Authentication (JWT expiry) mocks. `JwtSettings` is the exact projection the
 * `JwtExpirySection` query selects from the schema's `AppSettings` type, kept as
 * a schema-synced `Pick` so drift in those fields breaks the typecheck.
 */
export type JwtSettings = Pick<AppSettings, 'jwt_expires_in' | 'jwt_no_expiry' | 'updated_at'> & {
  __typename?: 'AppSettings';
};

export const makeJwtSettings = (over: Partial<JwtSettings> = {}): JwtSettings => ({
  __typename: 'AppSettings',
  jwt_expires_in: '7d',
  jwt_no_expiry: false,
  updated_at: null,
  ...over,
});
