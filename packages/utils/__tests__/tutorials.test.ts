import { describe, expect, it } from 'vitest';

import {
  TUTORIAL_FILTER_PARAMS,
  TUTORIAL_LANGUAGE_OPTIONS,
  TUTORIAL_PAGE_SIZE,
  TUTORIALS_PATH,
  formatTutorialDuration,
  hasTutorialFilters,
  hasWatchedEnough,
  parseTutorialFilters,
  tutorialFeedVariables,
  tutorialFilterParams,
  tutorialShareUrl,
  withFocusedFirst,
  type TutorialFilters,
} from '../src/tutorials';

const reader = (values: Record<string, unknown>) => (name: string) => values[name];
const EMPTY: TutorialFilters = { search: '', topic: '', language: '', focus: '' };

describe('parseTutorialFilters', () => {
  it('reads every filter from its query-string name and trims it', () => {
    const filters = parseTutorialFilters(reader({ q: '  join a pod ', topic: ' payments ', lang: 'hi', v: ' t1 ' }));
    expect(filters).toEqual({ search: 'join a pod', topic: 'payments', language: 'hi', focus: 't1' });
  });

  it('reads URLSearchParams through its get()', () => {
    const params = new URLSearchParams('lang=en&topic=hosting');
    expect(parseTutorialFilters((name) => params.get(name))).toEqual({ ...EMPTY, topic: 'hosting', language: 'en' });
  });

  it('drops an unknown language and treats missing or non-string values as unset', () => {
    expect(parseTutorialFilters(reader({ lang: 'fr', q: 42, topic: null }))).toEqual(EMPTY);
    expect(parseTutorialFilters(reader({ lang: ['hi'] })).language).toBe('');
  });
});

describe('tutorialFilterParams', () => {
  it('writes only the filters that are set, under their URL names', () => {
    expect(tutorialFilterParams({ search: ' pods ', topic: '', language: 'hi', focus: 'abc' })).toEqual({
      [TUTORIAL_FILTER_PARAMS.search]: 'pods',
      [TUTORIAL_FILTER_PARAMS.language]: 'hi',
      [TUTORIAL_FILTER_PARAMS.focus]: 'abc',
    });
  });

  it('gives a clean feed a clean URL', () => {
    expect(tutorialFilterParams(EMPTY)).toEqual({});
    expect(tutorialFilterParams({})).toEqual({});
  });

  it('round-trips through parseTutorialFilters', () => {
    const filters: TutorialFilters = { search: 'refund', topic: 'payments', language: 'en', focus: 'x9' };
    const params = new URLSearchParams(tutorialFilterParams(filters));
    expect(parseTutorialFilters((name) => params.get(name))).toEqual(filters);
  });
});

describe('hasWatchedEnough', () => {
  it('counts a video as watched from 90% of its length', () => {
    expect(hasWatchedEnough(89, 100)).toBe(false);
    expect(hasWatchedEnough(90, 100)).toBe(true);
    expect(hasWatchedEnough(100, 100)).toBe(true);
  });

  it('never counts a zero, negative or unknown duration', () => {
    expect(hasWatchedEnough(5, 0)).toBe(false);
    expect(hasWatchedEnough(5, -10)).toBe(false);
    expect(hasWatchedEnough(5, Number.NaN)).toBe(false);
    expect(hasWatchedEnough(5, Number.POSITIVE_INFINITY)).toBe(false);
    expect(hasWatchedEnough(Number.NaN, 100)).toBe(false);
  });
});

describe('tutorialFeedVariables', () => {
  it('sends empty filters as null and pages at the shared size', () => {
    expect(tutorialFeedVariables(EMPTY)).toEqual({
      search: null,
      topic: null,
      language: null,
      page: 1,
      page_size: TUTORIAL_PAGE_SIZE,
    });
  });

  it('passes set filters and the requested page through; focus is not a server filter', () => {
    const variables = tutorialFeedVariables({ search: 'pods', topic: 'hosting', language: 'hi', focus: 't1' }, 3);
    expect(variables).toEqual({ search: 'pods', topic: 'hosting', language: 'hi', page: 3, page_size: TUTORIAL_PAGE_SIZE });
  });
});

describe('hasTutorialFilters', () => {
  it('is true only when search, topic or language narrows the feed', () => {
    expect(hasTutorialFilters(EMPTY)).toBe(false);
    expect(hasTutorialFilters({ ...EMPTY, focus: 't1' })).toBe(false);
    expect(hasTutorialFilters({ ...EMPTY, search: 'x' })).toBe(true);
    expect(hasTutorialFilters({ ...EMPTY, topic: 'x' })).toBe(true);
    expect(hasTutorialFilters({ ...EMPTY, language: 'en' })).toBe(true);
  });
});

describe('tutorialShareUrl', () => {
  it('points at the Learnings page with the video to bring first', () => {
    expect(tutorialShareUrl('https://example.test', 'abc')).toBe(`https://example.test${TUTORIALS_PATH}?v=abc`);
  });

  it('drops trailing slashes on the origin and encodes the id', () => {
    expect(tutorialShareUrl('https://example.test//', 'a b/c')).toBe(`https://example.test${TUTORIALS_PATH}?v=a%20b%2Fc`);
  });
});

describe('formatTutorialDuration', () => {
  it('reads m:ss under an hour', () => {
    expect(formatTutorialDuration(0)).toBe('0:00');
    expect(formatTutorialDuration(5)).toBe('0:05');
    expect(formatTutorialDuration(125)).toBe('2:05');
    expect(formatTutorialDuration(125.9)).toBe('2:05');
  });

  it('reads h:mm:ss from an hour', () => {
    expect(formatTutorialDuration(3600)).toBe('1:00:00');
    expect(formatTutorialDuration(3725)).toBe('1:02:05');
  });

  it('treats a negative or non-finite length as zero', () => {
    expect(formatTutorialDuration(-30)).toBe('0:00');
    expect(formatTutorialDuration(Number.NaN)).toBe('0:00');
  });
});

describe('withFocusedFirst', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('moves the focused tutorial to the front and keeps the rest in order', () => {
    expect(withFocusedFirst(rows, 'c').map((row) => row.id)).toEqual(['c', 'a', 'b']);
    expect(withFocusedFirst(rows, 'b').map((row) => row.id)).toEqual(['b', 'a', 'c']);
  });

  it('leaves the order alone when nothing is focused, it is already first, or it is not on the page', () => {
    expect(withFocusedFirst(rows, '').map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(withFocusedFirst(rows, 'a').map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(withFocusedFirst(rows, 'zzz').map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(withFocusedFirst([], 'a')).toEqual([]);
  });

  it('returns a new array, never the input', () => {
    expect(withFocusedFirst(rows, 'a')).not.toBe(rows);
  });
});

describe('TUTORIAL_LANGUAGE_OPTIONS', () => {
  it('lists English then Hindi with literal translation keys', () => {
    expect(TUTORIAL_LANGUAGE_OPTIONS).toEqual([
      { value: 'en', labelKey: 'mweb.tutorials.languageEnglish' },
      { value: 'hi', labelKey: 'mweb.tutorials.languageHindi' },
    ]);
  });
});
