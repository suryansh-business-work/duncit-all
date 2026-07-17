import type { MockedResponse } from '@apollo/client/testing';
import type { FinanceSettings } from '@duncit/gql-types';
import { DEDUCTION_SETTINGS, UPDATE_DEDUCTIONS } from '../../src/pages/finance/default-deductions-page/queries';

/**
 * The Default Deductions page reads/writes the deduction slice of
 * `financeSettings`. The projection is a schema-synced `Pick` of the generated
 * `FinanceSettings` type (so a field rename breaks typecheck); the app treats
 * each numeric field defensively (`?? 0`), so the mock allows `null` to drive
 * that branch without an `as any`.
 */
type DeductionKeys =
  | 'gst_pct'
  | 'platform_fee_pct'
  | 'default_host_commission_pct'
  | 'default_venue_commission_pct'
  | 'default_product_commission_pct'
  | 'default_club_admin_pct'
  | 'default_backout_deduction_pct'
  | 'updated_at';

type Nullable<T> = { [K in keyof T]: T[K] | null };

export type DeductionSettings = { __typename?: 'FinanceSettings' } & Nullable<
  Pick<FinanceSettings, DeductionKeys>
>;

export const makeDeductionSettings = (over: Partial<DeductionSettings> = {}): DeductionSettings => ({
  __typename: 'FinanceSettings',
  gst_pct: 18,
  platform_fee_pct: 5,
  default_host_commission_pct: 10,
  default_venue_commission_pct: 10,
  default_product_commission_pct: 12,
  default_club_admin_pct: 3,
  default_backout_deduction_pct: 20,
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Every deduction field `null` — drives the `?? 0` fallback on each slider. */
export const nullDeductionSettings = (): DeductionSettings =>
  makeDeductionSettings({
    gst_pct: null,
    platform_fee_pct: null,
    default_host_commission_pct: null,
    default_venue_commission_pct: null,
    default_product_commission_pct: null,
    default_club_admin_pct: null,
    default_backout_deduction_pct: null,
  });

export const deductionSettingsMock = (
  settings: DeductionSettings | null = makeDeductionSettings(),
): MockedResponse => ({
  request: { query: DEDUCTION_SETTINGS },
  result: { data: { financeSettings: settings } },
  maxUsageCount: 20,
});

export const deductionSettingsLoadingMock = (): MockedResponse => ({
  request: { query: DEDUCTION_SETTINGS },
  result: { data: { financeSettings: makeDeductionSettings() } },
  delay: 60_000,
});

export const updateDeductionsMock = (over: { fail?: boolean; delay?: number } = {}): MockedResponse => ({
  request: { query: UPDATE_DEDUCTIONS },
  variableMatcher: () => true,
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('nope') }
    : { result: { data: { updateFinanceSettings: makeDeductionSettings() } } }),
});
