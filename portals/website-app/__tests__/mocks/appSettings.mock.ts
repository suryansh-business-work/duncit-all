import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import type { PublicAppSettings } from '@duncit/gql-types';

/**
 * Every table/date cell routes through `useDateFormat`, which fires
 * `publicAppSettings`. This typed mock resolves it so date columns format
 * deterministically and no unmocked-query noise leaks into the test output.
 */
export type AppSettingsMock = Pick<
  PublicAppSettings,
  'date_format' | 'time_format' | 'time_zone'
> & { __typename: 'PublicAppSettings' };

export const makeAppSettings = (over: Partial<AppSettingsMock> = {}): AppSettingsMock => ({
  __typename: 'PublicAppSettings',
  date_format: 'dd MMM yyyy',
  time_format: 'hh:mm a',
  time_zone: 'Asia/Kolkata',
  ...over,
});

export const appSettingsMock = (over: Partial<AppSettingsMock> = {}): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { publicAppSettings: makeAppSettings(over) } },
});
