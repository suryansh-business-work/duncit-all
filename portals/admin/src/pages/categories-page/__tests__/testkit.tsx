import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BRANDING } from '../../branding-page/queries';
import { CATEGORIES, type Level } from '../queries';

const theme = createTheme();

function Providers({
  mocks,
  children,
}: Readonly<{ mocks: readonly MockedResponse[]; children: ReactNode }>) {
  return (
    <MockedProvider mocks={mocks as MockedResponse[]}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </MockedProvider>
  );
}

/**
 * Renders a categories-page component inside the two providers its screens rely
 * on: Apollo's `MockedProvider` and the MUI theme. `MockedProvider` runs with
 * its default `addTypename: true`, so every mocked payload below carries
 * `__typename` — which is what keeps the mock cache behaving like production.
 */
export function renderWithProviders(ui: ReactElement, mocks: readonly MockedResponse[] = []) {
  return render(<Providers mocks={mocks}>{ui}</Providers>);
}

interface CategoryNode {
  __typename: string;
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  media: { __typename: string; url: string; type: 'IMAGE' | 'VIDEO' }[];
  level: Level;
  parent_id: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  allow_co_hosts: boolean | null;
  max_co_hosts: number | null;
  min_pax: number | null;
  icon_layout_mweb: { __typename: string; position: string; width: number; height: number } | null;
  icon_layout_native: { __typename: string; position: string; width: number; height: number } | null;
  gift_card_image_front: string;
  gift_card_image_back: string;
  updated_at: string;
}

/** One `categories` row shaped exactly like the CATEGORIES selection set. */
export const catNode = (over: Partial<CategoryNode> = {}): CategoryNode => ({
  __typename: 'Category',
  id: 'c1',
  name: 'Cricket',
  slug: 'cricket',
  icon: '',
  description: null,
  media: [],
  level: 'CATEGORY',
  parent_id: null,
  is_active: true,
  is_system: false,
  sort_order: 0,
  allow_co_hosts: false,
  max_co_hosts: 1,
  min_pax: 0,
  icon_layout_mweb: null,
  icon_layout_native: null,
  gift_card_image_front: '',
  gift_card_image_back: '',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const mediaNode = (url: string, type: 'IMAGE' | 'VIDEO' = 'IMAGE') => ({
  __typename: 'CategoryMedia',
  url,
  type,
});

/** A CATEGORIES mock keyed on the exact `filter` variables ColumnPanel sends. */
export const categoriesMock = (
  level: Level,
  parentId: string | null,
  categories: CategoryNode[]
): MockedResponse => ({
  request: { query: CATEGORIES, variables: { filter: { level, parent_id: parentId } } },
  result: { data: { categories } },
});

export const categoriesErrorMock = (
  level: Level,
  parentId: string | null,
  error: Error
): MockedResponse => ({
  request: { query: CATEGORIES, variables: { filter: { level, parent_id: parentId } } },
  error,
});

interface BrandingOverrides {
  home_all_vibe_icon_url?: string;
  home_all_vibe_icon_layout?: { __typename: string; position: string; width: number; height: number } | null;
  home_show_all_vibe_categories?: boolean;
}

/**
 * The Branding singleton with every field in BRANDING_FIELDS present — Apollo's
 * cache returns `undefined` for a partial payload, so a short mock would make
 * the card render its "no data" path instead of the values under test.
 */
export const brandingNode = (over: BrandingOverrides = {}) => ({
  __typename: 'Branding',
  app_name: 'Duncit',
  logo_url: '',
  primary_color: '#000000',
  support_email: 'support@duncit.com',
  support_phone: '',
  mweb_favicon_url: '',
  mweb_logo_url: '',
  mweb_splash_url: '',
  mweb_splash_type: 'IMAGE',
  mobile_favicon_url: '',
  mobile_logo_url: '',
  mobile_splash_url: '',
  mobile_splash_type: 'IMAGE',
  portals_favicon_url: '',
  portals_logo_url: '',
  portals_splash_url: '',
  portals_splash_type: 'IMAGE',
  website_header_logo_url: '',
  website_footer_logo_url: '',
  website_favicon_url: '',
  android_app_url: '',
  ios_app_url: '',
  home_all_vibe_icon_url: '',
  home_all_vibe_icon_layout: null,
  home_show_all_vibe_categories: false,
  home_header_tagline: '',
  mobile_font_family: 'Open Sans',
  mweb_font_family: 'Open Sans',
  portals_font_family: 'Open Sans',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const brandingMock = (over: BrandingOverrides = {}): MockedResponse => ({
  request: { query: BRANDING },
  result: { data: { branding: brandingNode(over) } },
});

export const layoutNode = (position: string, width: number, height: number) => ({
  __typename: 'CategoryIconLayout',
  position,
  width,
  height,
});
