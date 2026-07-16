import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import type { Branding } from '@duncit/gql-types';

/** The branding summary every shell chrome/login screen fires (useBranding). */
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
> & { __typename: 'Branding' };

export const makeBranding = (over: Partial<BrandingMock> = {}): BrandingMock => ({
  __typename: 'Branding',
  app_name: 'Duncit',
  logo_url: '/duncit-logo.svg',
  portals_logo_url: '',
  primary_color: '#2563eb',
  support_email: 'help@duncit.com',
  ...over,
});

export const brandingMock = (over: Partial<BrandingMock> = {}): MockedResponse => ({
  request: { query: APP_BRANDING },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { branding: makeBranding(over) } },
});
