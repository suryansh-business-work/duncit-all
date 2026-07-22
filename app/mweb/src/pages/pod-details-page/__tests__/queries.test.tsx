import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as queries from '../queries';

type OpKind = 'query' | 'mutation';

const opName = (doc: unknown): string | undefined => {
  const def = (doc as { definitions?: Array<{ kind: string; operation?: string; name?: { value: string } }> })
    .definitions?.[0];
  return def?.name?.value;
};

const opType = (doc: unknown): OpKind | undefined => {
  const def = (doc as { definitions?: Array<{ operation?: OpKind }> }).definitions?.[0];
  return def?.operation;
};

describe('pod-details-page queries module', () => {
  const cases: Array<[keyof typeof queries, string, OpKind]> = [
    ['POD_ID_BY_SLUGS', 'PodIdBySlugs', 'query'],
    ['POD_DETAILS', 'PodDetails', 'query'],
    ['PRODUCT_REVIEWS', 'ProductReviews', 'query'],
    ['CREATE_PRODUCT_REVIEW', 'CreateProductReview', 'mutation'],
    ['VOTE_PRODUCT_REVIEW', 'VoteProductReview', 'mutation'],
    ['PUBLIC_PRODUCT', 'PublicInventoryProduct', 'query'],
    ['PUBLIC_BRAND', 'PublicEcommBrand', 'query'],
    ['POD_PEOPLE', 'PodPeople', 'query'],
    ['INC_HITS', 'IncPodHits', 'mutation'],
    ['RECORD_PRODUCT_VIEW', 'RecordProductView', 'mutation'],
    ['RECORD_PRODUCT_CLICK', 'RecordProductClick', 'mutation'],
    ['JOIN_FREE', 'JoinFreePod', 'mutation'],
    ['BACKOUT', 'BackoutPod', 'mutation'],
    ['CANCEL_BACKOUT', 'CancelBackoutPod', 'mutation'],
    ['REDEEM', 'RedeemReferral', 'mutation'],
    ['TOGGLE_POD_LIKE', 'TogglePodLike', 'mutation'],
    ['POD_COMMENTS', 'PodComments', 'query'],
    ['TOGGLE_POD_COMMENT_LIKE', 'TogglePodCommentLike', 'mutation'],
    ['ADD_POD_COMMENT', 'AddPodComment', 'mutation'],
    ['DELETE_POD_COMMENT', 'DeletePodComment', 'mutation'],
    ['TOGGLE_SAVED_POD_DETAIL', 'ToggleSavedPodDetail', 'mutation'],
  ];

  it.each(cases)('%s is a valid %s document named %s', (exportKey, expectedName, expectedType) => {
    const doc = queries[exportKey];
    expect(doc).toBeDefined();
    expect((doc as { kind?: string }).kind).toBe('Document');
    expect(opName(doc)).toBe(expectedName);
    expect(opType(doc)).toBe(expectedType);
  });

  it('exposes exactly the expected named operations', () => {
    const names = cases
      .map(([key]) => opName(queries[key]))
      .filter(Boolean)
      .sort((a, b) => (a as string).localeCompare(b as string));
    expect(names).toContain('PodDetails');
    expect(new Set(names).size).toBe(cases.length);
  });

  it('POD_DETAILS selects the expected top-level query fields', () => {
    const source = (queries.POD_DETAILS.loc?.source.body ?? '') as string;
    for (const field of ['pod(', 'podMembershipState(', 'clubs', 'categories', 'locations', 'me']) {
      expect(source).toContain(field);
    }
  });

  it('re-exports PodDetailsSkeleton as a renderable component', () => {
    const { container } = render(<queries.PodDetailsSkeleton />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });
});
