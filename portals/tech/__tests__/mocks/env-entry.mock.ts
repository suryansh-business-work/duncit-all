import type { EnvEntry as SchemaEnvEntry } from '@duncit/gql-types';
import type {
  EnvCategoryDef,
  EnvEntry,
  EnvFieldDef,
} from '../../src/pages/environment/queries';
import type { PortalListItem } from '../../src/pages/environment/portal-env-queries';
import type { PortalRow } from '../../src/pages/environment/portal-mapping/PortalMappingTable';

/**
 * Environment (env-entry / portal-mapping) mocks. `makeEnvEntry` is a fully
 * typed `EnvEntry` from the generated `@duncit/gql-types` schema (carries
 * `__typename`), so schema drift breaks the typecheck. The category-definition
 * and portal factories are typed against the portal's own consumed interfaces.
 */
export const makeEnvEntry = (over: Partial<SchemaEnvEntry> = {}): EnvEntry => ({
  __typename: 'EnvEntry',
  id: 'ent1',
  name: 'SMTP One',
  category: 'EMAIL',
  description: 'd',
  is_default: false,
  is_active: true,
  assigned_portals: [],
  config: [],
  secrets: [],
  last_used_at: null,
  last_tested_at: null,
  last_test_ok: null,
  created_at: null,
  updated_at: null,
  ...over,
});

/* ---- Category field / definition factories ---- */

export const makeEnvFieldDef = (over: Partial<EnvFieldDef> = {}): EnvFieldDef => ({
  name: 'host',
  label: 'Host',
  secret: false,
  number: false,
  bool: false,
  ...over,
});

export const makeEnvCategoryDef = (over: Partial<EnvCategoryDef> = {}): EnvCategoryDef => ({
  category: 'EMAIL',
  label: 'Email',
  docUrl: null,
  fields: [makeEnvFieldDef()],
  ...over,
});

/** Twilio category def (account_sid + secret auth_token + phone_number). */
export const makeTwilioCategoryDef = (): EnvCategoryDef =>
  makeEnvCategoryDef({
    category: 'TWILIO',
    label: 'Twilio',
    fields: [
      makeEnvFieldDef({ name: 'account_sid', label: 'Account SID' }),
      makeEnvFieldDef({ name: 'auth_token', label: 'Auth Token', secret: true }),
      makeEnvFieldDef({ name: 'phone_number', label: 'Phone Number', phone: true }),
    ],
  });

/** ImageKit category def (public_key + secret private_key + url_endpoint). */
export const makeImagekitCategoryDef = (): EnvCategoryDef =>
  makeEnvCategoryDef({
    category: 'IMAGEKIT',
    label: 'ImageKit',
    docUrl: 'https://imagekit.io/dashboard/developer/api-keys',
    fields: [
      makeEnvFieldDef({ name: 'public_key', label: 'Public Key' }),
      makeEnvFieldDef({ name: 'private_key', label: 'Private Key', secret: true, hint: 'private_xxxx' }),
      makeEnvFieldDef({ name: 'url_endpoint', label: 'URL Endpoint' }),
    ],
  });

/** Email category def with a secret password + a boolean TLS toggle. */
export const makeEmailCategoryDef = (): EnvCategoryDef =>
  makeEnvCategoryDef({
    category: 'EMAIL',
    label: 'Email',
    fields: [
      makeEnvFieldDef({ name: 'host', label: 'Host' }),
      makeEnvFieldDef({ name: 'password', label: 'Password', secret: true }),
      makeEnvFieldDef({ name: 'secure', label: 'Use TLS', bool: true }),
    ],
  });

/* ---- Portal registry (mapping tab) ---- */

export const makePortalListItem = (over: Partial<PortalListItem> = {}): PortalListItem => ({
  key: 'crm',
  name: 'CRM',
  kind: 'PORTAL',
  ...over,
});

export const makePortalRow = (over: Partial<PortalRow> = {}): PortalRow => ({
  portal: makePortalListItem(),
  entries: [makeEnvEntry()],
  ...over,
});
