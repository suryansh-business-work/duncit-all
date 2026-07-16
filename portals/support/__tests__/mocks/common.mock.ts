import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import type { Branding, PublicAppSettings } from '@duncit/gql-types';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';

/**
 * Shared, portal-agnostic mocks every Support screen leans on: the admin
 * `branding` summary the shell chrome fires, and the `publicAppSettings` the
 * date/time formatter (`useDateFormat`) reads. Both are typed as `Pick<…>`
 * projections of the generated `@duncit/gql-types` schema and carry
 * `__typename`, so the default (`addTypename: true`) `MockedProvider` cache
 * behaves exactly like production — no deprecated `addTypename={false}` escape
 * hatch, no Apollo `__typename` runtime error.
 */

/** Mirrors the shell's private `AppBranding` query (packages/shell useBranding). */
export const APP_BRANDING = gql`
  query AppBranding {
    branding {
      app_name
      logo_url
      portals_logo_url
      primary_color
      support_email
    }
  }
`;

export type BrandingMock = Pick<
  Branding,
  'app_name' | 'logo_url' | 'portals_logo_url' | 'primary_color' | 'support_email'
> & { __typename?: 'Branding' };

export const makeBranding = (over: Partial<BrandingMock> = {}): BrandingMock => ({
  __typename: 'Branding',
  app_name: 'Duncit',
  logo_url: '/duncit-logo.svg',
  portals_logo_url: '',
  primary_color: '#10b981',
  support_email: 'help@duncit.com',
  ...over,
});

/** The branding query the shell header/sidebar fires on every render. */
export const brandingMock = (over: Partial<BrandingMock> = {}): MockedResponse => ({
  request: { query: APP_BRANDING },
  result: { data: { branding: makeBranding(over) } },
  maxUsageCount: 50,
});

export type PublicAppSettingsMock = Pick<
  PublicAppSettings,
  'date_format' | 'time_format' | 'time_zone'
> & { __typename?: 'PublicAppSettings' };

export const makePublicAppSettings = (
  over: Partial<PublicAppSettingsMock> = {},
): PublicAppSettingsMock => ({
  __typename: 'PublicAppSettings',
  date_format: 'dd MMM yyyy',
  time_format: 'HH:mm',
  time_zone: 'Asia/Kolkata',
  ...over,
});

/** Settings query fired by `useDateFormat` for tz-aware chat/ticket timestamps. */
export const publicAppSettingsMock = (
  over: Partial<PublicAppSettingsMock> = {},
): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  result: { data: { publicAppSettings: makePublicAppSettings(over) } },
  maxUsageCount: 50,
});

/**
 * Resolves the settings query to `null` — exercises the `useDateFormat`
 * fallback path (unconfigured settings) without leaving the query unmatched.
 */
export const publicAppSettingsNullMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  result: { data: { publicAppSettings: null } },
});
