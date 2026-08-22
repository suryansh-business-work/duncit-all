import type { GiftCardScopeType, GiftCardSettings } from '@duncit/gql-types';
import { defineDemo, defineDemos } from '../types';

/**
 * A test mock typed BY the schema.
 *
 * That is the whole package: it ships no runtime code at all, only the types
 * the server's codegen emits. Typing a mock with them means a schema change
 * that breaks the mock surfaces as a typecheck error on the next build rather
 * than as a test that keeps passing against a shape the API no longer sends.
 */
interface SettingsMock {
  settings: GiftCardSettings;
  scope: GiftCardScopeType;
}

export default defineDemos('gql-types', [
  defineDemo<SettingsMock>({
    id: 'typed-mock',
    title: 'A mock the schema itself checks',
    note:
      "Change scope to 'WALLET' in the editor and nothing complains here — but write it in a .ts file and tsc rejects it, because GiftCardScopeType is generated from the live schema.",
    mock: {
      settings: {
        __typename: 'GiftCardSettings',
        denominations: [500, 1000, 2000, 5000],
        min_amount: 100,
        max_amount: 10000,
        validity_months: 12,
        updated_at: '2026-08-01T00:00:00.000Z',
      },
      scope: 'SUPER',
    },
    compute: (mock) => ({
      'Amount chips the buy page offers': mock.settings.denominations,
      'Custom amount bounds': `${mock.settings.min_amount} – ${mock.settings.max_amount}`,
      'A card lives for': `${mock.settings.validity_months} months`,
      'Scope type': mock.scope,
      'Where these types come from':
        "server/codegen.ts writes packages/gql-types/src/schema.ts — never hand-edited.",
    }),
  }),
]);
