import { describe, expect, it } from 'vitest';

import { ME_FIELDS, buildMeQuerySource } from '../src/me-selection';

const FIELDS = ME_FIELDS.split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

describe('ME_FIELDS', () => {
  it('carries every field the session shape is normalized from', () => {
    expect(FIELDS).toEqual([
      'user_id',
      'first_name',
      'last_name',
      'full_name',
      'email',
      'phone_number',
      'phone_extension',
      'profile_photo',
      'bio',
      'roles',
      'locale',
      'timezone',
      'country',
      'city',
      'state',
      'zone',
      'assigned_city',
      'assigned_zones',
      'selected_location_id',
      'is_email_verified',
      'is_phone_verified',
      'onboarding_survey_completed',
      'created_at',
      'updated_at',
    ]);
  });

  it('includes locale — the field the two hand-rolled overrides used to drop', () => {
    expect(FIELDS).toContain('locale');
  });
});

describe('buildMeQuerySource', () => {
  it('wraps the shared selection in a named query', () => {
    const source = buildMeQuerySource();

    expect(source).toContain('query SessionMe {');
    expect(source).toContain('me {');
    expect(source).toContain('selected_location_id');
  });

  it('names the operation per surface, so two sessions are distinguishable in the cache', () => {
    expect(buildMeQuerySource('AdminSessionMe')).toContain('query AdminSessionMe {');
  });

  it('appends a surface’s extra fields inside the me block', () => {
    const source = buildMeQuerySource('MwebMe', '  wallet_balance  ');

    expect(source).toContain('wallet_balance');
    expect(source.indexOf('wallet_balance')).toBeGreaterThan(source.indexOf('updated_at'));
    expect(source.trimEnd().endsWith('}')).toBe(true);
  });

  it('adds nothing for a blank extras argument', () => {
    expect(buildMeQuerySource('X', '   ')).toBe(buildMeQuerySource('X'));
  });
});
