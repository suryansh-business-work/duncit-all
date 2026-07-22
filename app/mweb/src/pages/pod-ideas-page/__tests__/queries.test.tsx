import { describe, it, expect } from 'vitest';
import {
  POD_IDEAS,
  POD_IDEA_DETAILS,
  CREATE_IDEA,
  TOGGLE_LIKE,
  SHARE,
  ADD_COMMENT,
  DELETE_COMMENT,
  DELETE_IDEA,
  formatRelative,
} from '../queries';

const opName = (doc: { definitions: unknown[] }) =>
  (doc.definitions[0] as { name?: { value: string } }).name?.value;

describe('pod-ideas-page queries', () => {
  it('exports parsed GraphQL documents with expected operation names', () => {
    expect(opName(POD_IDEAS)).toBe('PodIdeas');
    expect(opName(POD_IDEA_DETAILS)).toBe('PodIdeaDetails');
    expect(opName(CREATE_IDEA)).toBe('CreatePodIdea');
    expect(opName(TOGGLE_LIKE)).toBe('TogglePodIdeaLike');
    expect(opName(SHARE)).toBe('SharePodIdea');
    expect(opName(ADD_COMMENT)).toBe('AddPodIdeaComment');
    expect(opName(DELETE_COMMENT)).toBe('DeletePodIdeaComment');
    expect(opName(DELETE_IDEA)).toBe('DeletePodIdea');
  });

  it('each document has a kind of Document', () => {
    for (const doc of [POD_IDEAS, POD_IDEA_DETAILS, CREATE_IDEA, TOGGLE_LIKE, SHARE, ADD_COMMENT, DELETE_COMMENT, DELETE_IDEA]) {
      expect(doc.kind).toBe('Document');
      expect(doc.definitions.length).toBeGreaterThan(0);
    }
  });
});

describe('formatRelative', () => {
  const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

  it('returns "just now" for < 1 minute', () => {
    expect(formatRelative(iso(30 * 1000))).toBe('just now');
  });

  it('returns minutes for < 60 minutes', () => {
    expect(formatRelative(iso(5 * 60000))).toBe('5m ago');
  });

  it('returns hours for < 24 hours', () => {
    expect(formatRelative(iso(3 * 3600000))).toBe('3h ago');
  });

  it('returns days for < 7 days', () => {
    expect(formatRelative(iso(2 * 86400000))).toBe('2d ago');
  });

  it('returns a locale date string for >= 7 days', () => {
    const old = iso(10 * 86400000);
    expect(formatRelative(old)).toBe(new Date(old).toLocaleDateString());
  });
});
