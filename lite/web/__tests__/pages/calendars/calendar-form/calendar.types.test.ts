import { describe, expect, it } from 'vitest';
import { calendarDefaults, makeCalendarSchema, toCalendarInput, type CalendarValues } from '../../../../pages/calendars/calendar-form';
import { calendarFixture } from '../../../test-utils';
import { t } from '../../event-form/helpers';

const schema = makeCalendarSchema(t);

const valid = (over: Partial<CalendarValues> = {}): CalendarValues => ({ name: 'Run Club', slug: '', description: '', avatar_url: '', cover_url: '', city_slug: '', ...over });

function problems(values: CalendarValues): string[] {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

describe('makeCalendarSchema', () => {
  it('accepts a calendar with just a name', () => {
    expect(problems(valid())).toEqual([]);
  });

  it('requires a name of at most 80 characters', () => {
    expect(problems(valid({ name: ' ' }))).toEqual(['name: This is required']);
    expect(problems(valid({ name: 'n'.repeat(81) }))).toEqual(['name: Keep this to 80 characters or fewer']);
    expect(problems(valid({ name: 'n'.repeat(80) }))).toEqual([]);
  });

  it('takes a link of lowercase words joined by single hyphens, lowercasing what is typed', () => {
    const parsed = schema.parse(valid({ slug: '  Run-Club-Delhi ' }));
    expect(parsed.slug).toBe('run-club-delhi');
  });

  it.each(['run club', 'run--club', '-run', 'run-', 'run_club', 'run/club'])('refuses the link %j', (slug) => {
    expect(problems(valid({ slug }))).toEqual(['slug: Use lowercase letters, numbers and hyphens only']);
  });

  it('keeps the link to 60 characters', () => {
    expect(problems(valid({ slug: 'a'.repeat(61) }))).toEqual(['slug: Keep this to 60 characters or fewer']);
    expect(problems(valid({ slug: 'a'.repeat(60) }))).toEqual([]);
  });

  it('keeps the description to 1,000 characters', () => {
    expect(problems(valid({ description: 'd'.repeat(1001) }))).toEqual(['description: Keep this to 1000 characters or fewer']);
  });

  it('accepts only full http(s) links for the pictures', () => {
    expect(problems(valid({ avatar_url: 'me.png', cover_url: 'javascript:alert(1)' }))).toEqual([
      'avatar_url: Enter a full link starting with http:// or https://',
      'cover_url: Enter a full link starting with http:// or https://',
    ]);
    expect(problems(valid({ avatar_url: 'https://cdn.example/me.png', cover_url: 'http://cdn.example/cover.png' }))).toEqual([]);
  });
});

describe('calendarDefaults', () => {
  it('starts a new calendar blank', () => {
    expect(calendarDefaults(null)).toEqual({ name: '', slug: '', description: '', avatar_url: '', cover_url: '', city_slug: '' });
  });

  it('loads an existing calendar, its missing parts as blanks', () => {
    expect(calendarDefaults(calendarFixture({ description: 'Saturday runs.', avatar_url: 'https://cdn.example/a.png', city_slug: 'delhi' }))).toEqual({
      name: 'Run Club',
      slug: 'run-club',
      description: 'Saturday runs.',
      avatar_url: 'https://cdn.example/a.png',
      cover_url: '',
      city_slug: 'delhi',
    });
  });
});

describe('toCalendarInput', () => {
  it('sends blank boxes as null so the API makes the link from the name', () => {
    expect(toCalendarInput(valid({ description: '  ' }))).toEqual({ name: 'Run Club', slug: null, description: null, avatar_url: null, cover_url: null, city_slug: null });
  });

  it('sends what was typed, trimmed', () => {
    expect(toCalendarInput(valid({ slug: 'run-club', description: ' Saturday runs. ', city_slug: 'delhi', cover_url: 'https://cdn.example/c.png' }))).toEqual({
      name: 'Run Club',
      slug: 'run-club',
      description: 'Saturday runs.',
      avatar_url: null,
      cover_url: 'https://cdn.example/c.png',
      city_slug: 'delhi',
    });
  });
});
