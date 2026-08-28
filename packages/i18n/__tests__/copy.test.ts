/**
 * The per-feature copy builders — the words three or more surfaces have to
 * render identically, resolved from one place so "Activity" and "Notifications"
 * can never name the same category on two screens.
 */
import { describe, expect, it } from 'vitest';
import { captchaCopy, captchaFallbackWord, CAPTCHA_FALLBACK_COPY } from '../src/captcha';
import { grievanceEscalationCopy, grievanceTicketFieldCopy } from '../src/grievance';
import { mailCategoryCopy } from '../src/mail-preference';
import { policyAcceptanceMethodLabel } from '../src/policy-acceptance';
import { whatsappCategoryCopy } from '../src/whatsapp';
import { allFallbackEntries } from '../src/bundles';

/** Answers `t:<key>`, so a test can tell a resolved label from a hard-coded one. */
const t = (key: string) => `t:${key}`;

const shipped = allFallbackEntries();

describe('captchaCopy', () => {
  it('resolves every word the widget draws through the translator', () => {
    expect(captchaCopy(t)).toEqual({
      title: 't:captcha.title',
      label: 't:captcha.label',
      hint: 't:captcha.hint',
      imageAlt: 't:captcha.imageAlt',
      refresh: 't:captcha.refresh',
      loading: 't:captcha.loading',
      unavailable: 't:captcha.unavailable',
      required: 't:captcha.required',
      wrong: 't:captcha.wrong',
      expired: 't:captcha.expired',
    });
  });

  // The Astro marketing sites have no translator at build time, so the same
  // words are read straight off the shipped bundle rather than written twice.
  it('ships a default-language copy with real words behind every field', () => {
    for (const [field, value] of Object.entries(CAPTCHA_FALLBACK_COPY)) {
      expect(value, field).not.toBe('');
      expect(value, field).not.toMatch(/^captcha\./);
    }
  });

  it('reads a word the bundle does not carry back as its own key', () => {
    // A missing word is a bug, not a blank label: the key is at least
    // greppable. The lookup is typed as possibly-undefined under the native
    // app's compiler, so this fallback is a contract rather than dead code.
    expect(captchaFallbackWord('captcha.somethingNew')).toBe('captcha.somethingNew');
  });

  it('reads each fallback word off the shipped bundle, not a second copy of it', () => {
    expect(CAPTCHA_FALLBACK_COPY.title).toBe(shipped['captcha.title']);
    expect(CAPTCHA_FALLBACK_COPY.expired).toBe(shipped['captcha.expired']);
  });
});

describe('grievanceEscalationCopy', () => {
  it('states the consequence and the three steps, in the order they happen', () => {
    const copy = grievanceEscalationCopy(t);

    expect(copy.title).toBe('t:grievance.escalationTitle');
    expect(copy.warning).toBe('t:grievance.escalationWarning');
    expect(copy.steps.map((step) => step.key)).toEqual(['raise', 'wait', 'escalate']);
    expect(copy.steps.map((step) => step.title)).toEqual([
      't:grievance.step.raise.title',
      't:grievance.step.wait.title',
      't:grievance.step.escalate.title',
    ]);
    expect(copy.steps.map((step) => step.body)).toEqual([
      't:grievance.step.raise.body',
      't:grievance.step.wait.body',
      't:grievance.step.escalate.body',
    ]);
  });

  it('ships copy for every key it renders', () => {
    for (const key of [
      'grievance.escalationTitle',
      'grievance.escalationWarning',
      'grievance.step.raise.title',
      'grievance.step.wait.body',
      'grievance.step.escalate.body',
    ]) {
      expect(shipped, key).toHaveProperty(key);
    }
  });
});

describe('grievanceTicketFieldCopy', () => {
  // Same field on three surfaces, two hints — kept together so the hints cannot
  // start describing different things.
  it('gives the dropdown and the typed box their own hints under one label', () => {
    expect(grievanceTicketFieldCopy(t)).toEqual({
      label: 't:grievance.field.support_ticket_ref',
      selectHint: 't:grievance.ticketSelectHint',
      refHint: 't:grievance.ticketRefHint',
      placeholder: 't:grievance.ticketNonePlaceholder',
      refPlaceholder: 't:grievance.ticketRefPlaceholder',
      emptyTitle: 't:grievance.ticketEmptyTitle',
      emptyBody: 't:grievance.ticketEmptyBody',
      emptyCta: 't:grievance.ticketEmptyCta',
    });
  });
});

describe('mailCategoryCopy', () => {
  const CATEGORIES = [
    'marketing',
    'notification',
    'service',
    'support',
    'transactional',
    'authentication',
    'billing',
    'legal',
    'internal',
  ];

  it('names and explains all nine categories, each from its own key', () => {
    for (const category of CATEGORIES) {
      expect(mailCategoryCopy(t, category)).toEqual({
        label: `t:mailPreference.categories.${category}.label`,
        description: `t:mailPreference.categories.${category}.description`,
      });
    }
  });

  it('ships copy for every one of them', () => {
    for (const category of CATEGORIES) {
      expect(shipped).toHaveProperty(`mailPreference.categories.${category}.label`);
      expect(shipped).toHaveProperty(`mailPreference.categories.${category}.description`);
    }
  });

  // A tenth category is a server ahead of a client release. The row still
  // lists it under its own name, so the person can still switch it off.
  it('falls back to the category name rather than a raw key it has no copy for', () => {
    expect(mailCategoryCopy(t, 'shipping')).toEqual({ label: 'shipping', description: '' });
  });
});

describe('whatsappCategoryCopy', () => {
  const CATEGORIES = [
    'transactional',
    'billing',
    'account',
    'notification',
    'reminder',
    'feedback',
    'marketing',
    'support',
  ];

  it('names and explains all eight categories, each from its own key', () => {
    for (const category of CATEGORIES) {
      expect(whatsappCategoryCopy(t, category)).toEqual({
        label: `t:whatsappPreference.categories.${category}.label`,
        description: `t:whatsappPreference.categories.${category}.description`,
      });
    }
  });

  it('ships copy for every one of them', () => {
    for (const category of CATEGORIES) {
      expect(shipped).toHaveProperty(`whatsappPreference.categories.${category}.label`);
      expect(shipped).toHaveProperty(`whatsappPreference.categories.${category}.description`);
    }
  });

  it('falls back to the category name rather than a raw key it has no copy for', () => {
    expect(whatsappCategoryCopy(t, 'shipping')).toEqual({ label: 'shipping', description: '' });
  });
});

describe('policyAcceptanceMethodLabel', () => {
  it('names each way an acceptance was given', () => {
    expect(policyAcceptanceMethodLabel(t, 'SIGNUP_FORM')).toBe(
      't:legalAcceptanceLogs.methods.signupForm',
    );
    expect(policyAcceptanceMethodLabel(t, 'GOOGLE_SIGNUP')).toBe(
      't:legalAcceptanceLogs.methods.googleSignup',
    );
  });

  // The copy is written from the reader's side, so both spellings of "accepted
  // from inside an account that already existed" read the same.
  it('reads ACCOUNT and LATER as the same words', () => {
    expect(policyAcceptanceMethodLabel(t, 'ACCOUNT')).toBe('t:legalAcceptanceLogs.methods.later');
    expect(policyAcceptanceMethodLabel(t, 'LATER')).toBe('t:legalAcceptanceLogs.methods.later');
  });

  // An audit row must still read for a method wired ahead of a client release.
  it('falls back to the method itself rather than a raw key', () => {
    expect(policyAcceptanceMethodLabel(t, 'IMPORTED')).toBe('IMPORTED');
  });
});
