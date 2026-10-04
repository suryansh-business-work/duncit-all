import { describe, it, expect, vi } from 'vitest';
import { formatDate } from '../../../utils/dateFormat';
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

const opName = (doc: any) =>
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

  it('returns the admin-formatted date (not the device locale) for >= 7 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T12:00:00.000Z'));
    try {
      const old = '2026-09-24T12:00:00.000Z';
      // Same formatter every other date in mWeb goes through (default dd MMM yyyy).
      expect(formatRelative(old)).toBe(formatDate(old));
      expect(formatRelative(old)).toBe('24 Sep 2026');
    } finally {
      vi.useRealTimers();
    }
  });
});
