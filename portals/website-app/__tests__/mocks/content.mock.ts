import type { MockedResponse } from '@apollo/client/testing';
import type { WebsiteContentItem as SchemaWebsiteContentItem } from '@duncit/gql-types';
import {
  CONTENT_TABLE,
  CREATE_CONTENT,
  DELETE_CONTENT,
  UPDATE_CONTENT,
  WEBSITE_CONTENT,
} from '../../src/pages/website/content/queries';
import { tablePageMock } from './table';

/**
 * Website content-item projection: a schema-synced `Pick` of the generated
 * `WebsiteContentItem` with the nullable `published_at` narrowed to the app's
 * `string | null`, plus the cache `__typename`.
 */
export type WebsiteContentItemMock = Pick<
  SchemaWebsiteContentItem,
  | 'id'
  | 'type'
  | 'title'
  | 'slug'
  | 'summary'
  | 'body'
  | 'category'
  | 'image_url'
  | 'cta_label'
  | 'cta_url'
  | 'is_published'
  | 'sort_order'
  | 'created_at'
  | 'updated_at'
> & { __typename: 'WebsiteContentItem'; published_at: string | null };

export const makeContentItem = (
  over: Partial<WebsiteContentItemMock> = {},
): WebsiteContentItemMock => ({
  __typename: 'WebsiteContentItem',
  id: '1',
  type: 'BLOG',
  title: 'First',
  slug: 'first',
  summary: '',
  body: '',
  category: 'Eng',
  image_url: 'https://img/a.png',
  cta_label: '',
  cta_url: '',
  published_at: '2026-01-01T00:00:00.000Z',
  is_published: true,
  sort_order: 1,
  created_at: '2026-01-02T00:00:00.000Z',
  updated_at: '2026-01-03T00:00:00.000Z',
  ...over,
});

export const websiteContentTableMock = (
  rows: WebsiteContentItemMock[] = [makeContentItem()],
): MockedResponse =>
  tablePageMock(CONTENT_TABLE, 'websiteContentTable', 'WebsiteContentItemTablePage', rows);

/** Full list query (dashboard KPI counts). */
export const websiteContentListMock = (
  rows: WebsiteContentItemMock[] = [],
): MockedResponse => ({
  request: { query: WEBSITE_CONTENT },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { websiteContent: rows } },
});

export const createContentMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: CREATE_CONTENT },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: over.fail
    ? { errors: [{ message: 'Boom failed' }] }
    : { data: { createWebsiteContent: { __typename: 'WebsiteContentItem', id: 'a' } } },
});

export const updateContentMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: UPDATE_CONTENT },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: over.fail
    ? { errors: [{ message: 'Boom failed' }] }
    : { data: { updateWebsiteContent: { __typename: 'WebsiteContentItem', id: 'a' } } },
});

export const deleteContentMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: DELETE_CONTENT },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: over.fail
    ? { errors: [{ message: 'Boom failed' }] }
    : { data: { deleteWebsiteContent: true } },
});
