import type { MockedResponse } from '@apollo/client/testing';
import type { WebsiteNavItem as SchemaWebsiteNavItem } from '@duncit/gql-types';
import {
  CREATE_NAV_ITEM,
  DELETE_NAV_ITEM,
  UPDATE_NAV_ITEM,
  WEBSITE_NAV_TABLE,
} from '../../src/pages/website/navigation/queries';
import { tablePageMock } from './table';

/**
 * Website nav-link projection: a schema-synced `Pick` of the generated
 * `WebsiteNavItem` (drift breaks typecheck) plus the cache `__typename`. The
 * table selects `created_at`; leave it blank to exercise the "—" valueGetter.
 */
export type WebsiteNavItemMock = Pick<
  SchemaWebsiteNavItem,
  | 'id'
  | 'site'
  | 'area'
  | 'group_label'
  | 'label'
  | 'url'
  | 'sort_order'
  | 'is_active'
  | 'created_at'
> & { __typename: 'WebsiteNavItem' };

export const makeNavItem = (over: Partial<WebsiteNavItemMock> = {}): WebsiteNavItemMock => ({
  __typename: 'WebsiteNavItem',
  id: 'n1',
  site: 'MAIN',
  area: 'FOOTER',
  group_label: 'About',
  label: 'Careers',
  url: '/careers',
  sort_order: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const websiteNavTableMock = (
  rows: WebsiteNavItemMock[] = [makeNavItem()],
): MockedResponse =>
  tablePageMock(WEBSITE_NAV_TABLE, 'websiteNavTable', 'WebsiteNavItemTablePage', rows);

export const createNavItemMock = (): MockedResponse => ({
  request: { query: CREATE_NAV_ITEM },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { createWebsiteNavItem: { __typename: 'WebsiteNavItem', id: 'a' } } },
});

export const updateNavItemMock = (): MockedResponse => ({
  request: { query: UPDATE_NAV_ITEM },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { updateWebsiteNavItem: { __typename: 'WebsiteNavItem', id: 'a' } } },
});

export const deleteNavItemMock = (): MockedResponse => ({
  request: { query: DELETE_NAV_ITEM },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { deleteWebsiteNavItem: true } },
});
