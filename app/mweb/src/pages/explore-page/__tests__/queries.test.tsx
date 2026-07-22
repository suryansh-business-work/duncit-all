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

const body = (doc: unknown): string => ((doc as { loc?: { source: { body: string } } }).loc?.source.body ?? '');

describe('explore-page queries module', () => {
  const cases: Array<[keyof typeof queries, string, OpKind]> = [
    ['EXPLORE_PODS', 'ExplorePods', 'query'],
    ['POD_LIKERS', 'PodLikers', 'query'],
    ['TOGGLE_SAVED_POD', 'ToggleSavedPod', 'mutation'],
  ];

  it.each(cases)('%s is a valid %s document named %s', (exportKey, expectedName, expectedType) => {
    const doc = queries[exportKey];
    expect(doc).toBeDefined();
    expect((doc as { kind?: string }).kind).toBe('Document');
    expect(opName(doc)).toBe(expectedName);
    expect(opType(doc)).toBe(expectedType);
  });

  it('exposes exactly the expected unique named operations', () => {
    const names = cases
      .map(([key]) => opName(queries[key]))
      .filter(Boolean)
      .sort((a, b) => (a as string).localeCompare(b as string));
    expect(names).toEqual(['ExplorePods', 'PodLikers', 'ToggleSavedPod']);
    expect(new Set(names).size).toBe(cases.length);
  });

  it('EXPLORE_PODS selects the expected top-level query fields', () => {
    const source = body(queries.EXPLORE_PODS);
    for (const field of ['me', 'pods(', 'clubs(', 'superCategories:', 'categories', 'locations']) {
      expect(source).toContain(field);
    }
  });

  it('EXPLORE_PODS filters pods to active reels and clubs to active', () => {
    const source = body(queries.EXPLORE_PODS);
    expect(source).toContain('is_active: true');
    expect(source).toContain('has_reel: true');
    expect(source).toContain('level: SUPER');
    for (const field of ['pod_id', 'reel_url', 'liked_by_me', 'liked_user_ids', 'comment_count', 'saved_pod_ids']) {
      expect(source).toContain(field);
    }
  });

  it('POD_LIKERS declares the ids variable and resolves public user fields', () => {
    const source = body(queries.POD_LIKERS);
    expect(source).toContain('$ids: [ID!]!');
    expect(source).toContain('publicUsersByIds(user_ids: $ids)');
    for (const field of ['full_name', 'first_name', 'username', 'profile_photo']) {
      expect(source).toContain(field);
    }
  });

  it('TOGGLE_SAVED_POD declares pod_doc_id and returns saved state', () => {
    const source = body(queries.TOGGLE_SAVED_POD);
    expect(source).toContain('$pod_doc_id: ID!');
    expect(source).toContain('toggleSavedPod(pod_doc_id: $pod_doc_id)');
    for (const field of ['pod_id', 'saved', 'saved_pod_ids']) {
      expect(source).toContain(field);
    }
  });
});
