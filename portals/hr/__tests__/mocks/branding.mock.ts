import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import type { Branding } from '@duncit/gql-types';

/**
 * The five-field `branding` projection the shared `useBranding` hook selects —
 * a schema-synced `Pick` of the generated `Branding` type (drift breaks
 * typecheck) with the `__typename` the Apollo cache needs under the default
 * `addTypename`.
 */
export type BrandingSummaryFields = Pick<
  Branding,
  'app_name' | 'logo_url' | 'portals_logo_url' | 'primary_color' | 'support_email'
> & { __typename: 'Branding' };

/** The exact document `@duncit/shell`'s `useBranding` fires (query `AppBranding`). */
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

export const makeBranding = (over: Partial<BrandingSummaryFields> = {}): BrandingSummaryFields => ({
  __typename: 'Branding',
  app_name: 'Duncit',
  logo_url: '/duncit-logo.svg',
  portals_logo_url: '',
  primary_color: '#9333ea',
  support_email: 'help@duncit.com',
  ...over,
});

/** `MockedResponse` for the branding query every shell chrome component fires. */
export const brandingMock = (over: Partial<BrandingSummaryFields> = {}): MockedResponse => ({
  request: { query: APP_BRANDING },
  result: { data: { branding: makeBranding(over) } },
});
