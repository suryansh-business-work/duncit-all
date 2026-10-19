/**
 * Gig Jobs forms — the post, the freelancer profile and the interest note, one
 * rule set for mWeb, Partners and native. The bounds are the server's
 * (gigJob.validator.ts GIG_LIMITS). Assertions on messages are on KEYS.
 */
import { describe, expect, it } from 'vitest';

import {
  GIG_LIMITS,
  gigInterestDefaults,
  makeFreelancerProfileSchema,
  makeGigInterestSchema,
  makeGigJobSchema,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const issuesOf = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}=${issue.message}`);

const POST = {
  poster_role: 'VENUE_OWNER',
  category_id: 'c1',
  title: 'Photographer for a pottery workshop',
  description: '',
  roles: ['Photographer'],
  event_type: 'WORKSHOP' as const,
  event_date: '2026-11-02',
  city: 'Pune',
  location: '',
  budget: '',
  openings: '1',
  contact_name: 'Asha Rao',
  contact_phone: '+91 98765-43210',
  contact_email: '',
};

const PROFILE = {
  display_name: 'Ravi',
  category_ids: ['c1'],
  skills: ['Photographer'],
  city: 'Pune',
  bio: '',
  portfolio_url: '',
  experience_years: '',
  contact_phone: '9876543210',
  contact_email: 'ravi@example.com',
  is_available: true,
};

describe('makeGigJobSchema', () => {
  const schema = makeGigJobSchema(t);
  const issuesFor = (patch: Partial<typeof POST>) => issuesOf(schema.safeParse({ ...POST, ...patch }));

  it('accepts a minimal post — no budget, no date, no email, spaced phone', () => {
    expect(issuesFor({})).toEqual([]);
    expect(issuesFor({ event_date: '' })).toEqual([]);
  });

  it('accepts a budget and openings inside the bounds', () => {
    expect(issuesFor({ budget: '0', openings: String(GIG_LIMITS.openingsMax) })).toEqual([]);
    expect(issuesFor({ budget: String(GIG_LIMITS.budgetMax) })).toEqual([]);
  });

  it('needs a poster role the server lets post', () => {
    expect(issuesFor({ poster_role: '' })).toEqual(['poster_role=gigJobs.validation.posterRoleRequired']);
    expect(issuesFor({ poster_role: 'FREELANCER' })).toEqual(['poster_role=gigJobs.validation.posterRoleRequired']);
  });

  it('needs a category, a title of fair length, a role and a city', () => {
    const titleLength = `gigJobs.validation.titleLength:${JSON.stringify({ min: GIG_LIMITS.titleMin, max: GIG_LIMITS.titleMax })}`;
    expect(issuesFor({ category_id: '' })).toEqual(['category_id=gigJobs.validation.categoryRequired']);
    expect(issuesFor({ title: '  ab  ' })).toEqual([`title=${titleLength}`]);
    expect(issuesFor({ title: 'x'.repeat(GIG_LIMITS.titleMax + 1) })).toEqual([`title=${titleLength}`]);
    expect(issuesFor({ roles: [] })).toEqual(['roles=gigJobs.validation.rolesRequired']);
    expect(issuesFor({ city: '   ' })).toEqual(['city=gigJobs.validation.cityRequired']);
  });

  it('caps the number of roles', () => {
    const roles = Array.from({ length: GIG_LIMITS.rolesMax + 1 }, (_, i) => `Role ${i}`);
    expect(issuesFor({ roles })).toEqual([`roles=gigJobs.validation.rolesTooMany:{"max":${GIG_LIMITS.rolesMax}}`]);
  });

  it('refuses a budget that is not a whole number of rupees in range', () => {
    const message = `budget=gigJobs.validation.budgetInvalid:{"max":${GIG_LIMITS.budgetMax}}`;
    expect(issuesFor({ budget: '12.5' })).toEqual([message]);
    expect(issuesFor({ budget: '-1' })).toEqual([message]);
    expect(issuesFor({ budget: String(GIG_LIMITS.budgetMax + 1) })).toEqual([message]);
  });

  it('needs at least one opening and no more than the cap', () => {
    const message = `openings=gigJobs.validation.openingsInvalid:{"max":${GIG_LIMITS.openingsMax}}`;
    expect(issuesFor({ openings: '0' })).toEqual([message]);
    expect(issuesFor({ openings: '' })).toEqual([message]);
    expect(issuesFor({ openings: String(GIG_LIMITS.openingsMax + 1) })).toEqual([message]);
  });

  it('refuses a date it cannot read', () => {
    expect(issuesFor({ event_date: 'next friday' })).toEqual(['event_date=gigJobs.validation.dateInvalid']);
  });

  it('checks the contact the freelancer will be given', () => {
    expect(issuesFor({ contact_name: 'A' })).toEqual(['contact_name=gigJobs.validation.nameRequired']);
    expect(issuesFor({ contact_phone: '' })).toEqual(['contact_phone=gigJobs.validation.phoneRequired']);
    expect(issuesFor({ contact_phone: '12345' })).toEqual(['contact_phone=gigJobs.validation.phoneInvalid']);
    expect(issuesFor({ contact_email: 'not-an-email' })).toEqual(['contact_email=gigJobs.validation.emailInvalid']);
  });

  it('caps the free-text fields at the server’s bounds', () => {
    expect(issuesFor({ description: 'x'.repeat(GIG_LIMITS.descriptionMax + 1) })).toEqual([
      `description=gigJobs.validation.tooLong:{"max":${GIG_LIMITS.descriptionMax}}`,
    ]);
    expect(issuesFor({ location: 'x'.repeat(GIG_LIMITS.locationMax + 1) })).toEqual([
      `location=gigJobs.validation.tooLong:{"max":${GIG_LIMITS.locationMax}}`,
    ]);
    expect(issuesFor({ city: 'x'.repeat(GIG_LIMITS.cityMax + 1) })).toEqual([
      `city=gigJobs.validation.tooLong:{"max":${GIG_LIMITS.cityMax}}`,
    ]);
    expect(issuesFor({ contact_name: 'x'.repeat(GIG_LIMITS.nameMax + 1) })).toEqual([
      `contact_name=gigJobs.validation.tooLong:{"max":${GIG_LIMITS.nameMax}}`,
    ]);
  });
});

describe('makeFreelancerProfileSchema', () => {
  const schema = makeFreelancerProfileSchema(t);
  const issuesFor = (patch: Partial<typeof PROFILE>) => issuesOf(schema.safeParse({ ...PROFILE, ...patch }));

  it('accepts a profile with only the required parts', () => {
    expect(issuesFor({})).toEqual([]);
  });

  it('accepts a portfolio link and years of experience in range', () => {
    expect(issuesFor({ portfolio_url: 'https://ravi.example/work', experience_years: String(GIG_LIMITS.experienceMax) })).toEqual([]);
  });

  it('needs a name, a category, a skill and a city', () => {
    expect(issuesFor({ display_name: ' ' })).toEqual(['display_name=gigJobs.validation.nameRequired']);
    expect(issuesFor({ category_ids: [] })).toEqual(['category_ids=gigJobs.validation.categoriesRequired']);
    expect(issuesFor({ skills: [] })).toEqual(['skills=gigJobs.validation.skillsRequired']);
    expect(issuesFor({ city: '' })).toEqual(['city=gigJobs.validation.cityRequired']);
  });

  it('caps categories and skills', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => `x${i}`);
    expect(issuesFor({ category_ids: many(GIG_LIMITS.categoriesMax + 1) })).toEqual([
      `category_ids=gigJobs.validation.categoriesTooMany:{"max":${GIG_LIMITS.categoriesMax}}`,
    ]);
    expect(issuesFor({ skills: many(GIG_LIMITS.skillsMax + 1) })).toEqual([
      `skills=gigJobs.validation.skillsTooMany:{"max":${GIG_LIMITS.skillsMax}}`,
    ]);
  });

  it('takes only a web link for the portfolio', () => {
    expect(issuesFor({ portfolio_url: 'ravi.example' })).toEqual(['portfolio_url=gigJobs.validation.linkInvalid']);
    expect(issuesFor({ portfolio_url: 'ftp://ravi.example' })).toEqual(['portfolio_url=gigJobs.validation.linkInvalid']);
  });

  it('refuses years of experience that are not a whole number in range', () => {
    const message = `experience_years=gigJobs.validation.experienceInvalid:{"max":${GIG_LIMITS.experienceMax}}`;
    expect(issuesFor({ experience_years: '2.5' })).toEqual([message]);
    expect(issuesFor({ experience_years: String(GIG_LIMITS.experienceMax + 1) })).toEqual([message]);
  });

  it('caps the bio and checks the contact', () => {
    expect(issuesFor({ bio: 'x'.repeat(GIG_LIMITS.bioMax + 1) })).toEqual([
      `bio=gigJobs.validation.tooLong:{"max":${GIG_LIMITS.bioMax}}`,
    ]);
    expect(issuesFor({ contact_phone: 'call me' })).toEqual(['contact_phone=gigJobs.validation.phoneInvalid']);
    expect(issuesFor({ contact_email: 'ravi@' })).toEqual(['contact_email=gigJobs.validation.emailInvalid']);
  });

  it('needs availability as a yes or no', () => {
    expect(schema.safeParse({ ...PROFILE, is_available: 'yes' }).success).toBe(false);
  });
});

describe('makeGigInterestSchema', () => {
  const schema = makeGigInterestSchema(t);

  it('needs no note, and trims one', () => {
    expect(schema.parse(gigInterestDefaults)).toEqual({ message: '' });
    expect(schema.parse({ message: '  I shoot weddings.  ' })).toEqual({ message: 'I shoot weddings.' });
  });

  it('refuses a note over the bound', () => {
    expect(issuesOf(schema.safeParse({ message: 'x'.repeat(GIG_LIMITS.messageMax + 1) }))).toEqual([
      `message=gigJobs.validation.tooLong:{"max":${GIG_LIMITS.messageMax}}`,
    ]);
  });
});
