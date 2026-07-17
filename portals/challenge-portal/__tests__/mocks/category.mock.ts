import type { MockedResponse } from '@apollo/client/testing';
import type { Category } from '@duncit/gql-types';
import type { AdminCategoryValue } from '@duncit/category';
import { CATEGORY_OPTIONS, type CategoryOption } from '../../src/graphql/challenges';

/**
 * Category-domain mocks. The `categories` query used by the challenge table
 * filters projects only `{ id name }`, so the factory is a schema-synced `Pick`
 * of the canonical `Category` (plus `__typename`) — never `any`.
 */
export type CategoryOptionMock = Pick<Category, 'id' | 'name'> & {
  __typename: 'Category';
};

export const makeCategoryOption = (
  over: Partial<CategoryOptionMock> = {},
): CategoryOption & CategoryOptionMock => ({
  __typename: 'Category',
  id: 'cat-1',
  name: 'Category One',
  ...over,
});

type Level = 'SUPER' | 'CATEGORY' | 'SUB';

/** `categories(filter: { level }) { id name }` for one cascade level. */
export const categoryOptionsMock = (
  level: Level,
  options: Array<CategoryOption & CategoryOptionMock>,
): MockedResponse => ({
  request: { query: CATEGORY_OPTIONS, variables: { filter: { level } } },
  result: { data: { categories: options } },
  maxUsageCount: 20,
});

/** The three level queries the challenge table fires on mount. */
export const challengeTableCategoryMocks = (): MockedResponse[] => [
  categoryOptionsMock('SUPER', [makeCategoryOption({ id: 's1', name: 'Super 1' })]),
  categoryOptionsMock('CATEGORY', [makeCategoryOption({ id: 'c1', name: 'Cat 1' })]),
  // SUB resolves to an empty list — exercises the `?? []` map fallback path.
  categoryOptionsMock('SUB', []),
];

/**
 * The admin-category value the shared `AdminCategorySelect` emits when a user
 * picks a full Super → Category → Sub scope. Consumed by the CategoryCascade
 * spec to assert the mapping back into the portal's `{superId,…}` contract.
 */
export const adminCategoryChange: AdminCategoryValue = {
  super_id: 's2',
  super_name: 'S2',
  category_id: 'c2',
  category_name: 'C2',
  sub_id: 'sub2',
  sub_name: 'Sub2',
};
