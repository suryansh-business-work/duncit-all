import { describe, expect, it } from 'vitest';
import {
  LEAD_EVIDENCE_TEXT_MAX,
  LEAD_EVIDENCE_URL_MAX,
  leadEvidenceDecision,
  leadEvidenceDefaults,
  makeLeadEvidenceSchema,
} from '../src/schemas/lead-evidence';

/** One evidence decision: the key and its vars are echoed, so each assertion names the message shown. */
const schema = makeLeadEvidenceSchema((key, options) => (options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key));
const messages = (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`);
};
const verified = { status: 'VERIFIED', evidence: 'Listed on Google Maps', source_url: '', notes: '' };

describe('makeLeadEvidenceSchema', () => {
  it('takes a verified decision with what proves it, and an optional http(s) source', () => {
    expect(messages(verified)).toEqual([]);
    expect(messages({ ...verified, source_url: 'https://maps.google.com/x', notes: 'Checked today' })).toEqual([]);
  });

  it('asks what proves a verified item and why an unmet one is not met', () => {
    expect(messages({ ...verified, evidence: ' ok ' })).toEqual(['evidence crm.leadQualityTab.evidenceRequired:{"min":3}']);
    expect(messages({ ...verified, status: 'FAILED', evidence: '' })).toEqual([
      'evidence crm.leadQualityTab.reasonRequired:{"min":3}',
    ]);
  });

  it('refuses text and links over the server limits', () => {
    expect(messages({ ...verified, evidence: 'x'.repeat(LEAD_EVIDENCE_TEXT_MAX + 1) })).toEqual([
      'evidence crm.leadQualityTab.textTooLong:{"max":1000}',
    ]);
    expect(messages({ ...verified, notes: 'x'.repeat(LEAD_EVIDENCE_TEXT_MAX + 1) })).toEqual([
      'notes crm.leadQualityTab.textTooLong:{"max":1000}',
    ]);
    expect(messages({ ...verified, source_url: `https://a.in/${'x'.repeat(LEAD_EVIDENCE_URL_MAX)}` })).toEqual([
      'source_url crm.leadQualityTab.textTooLong:{"max":500}',
    ]);
  });

  it('refuses a source that is not a web link', () => {
    expect(messages({ ...verified, source_url: 'maps listing' })).toEqual(['source_url crm.leadQualityTab.sourceInvalid']);
    expect(messages({ ...verified, source_url: 'ftp://files.in/a' })).toEqual(['source_url crm.leadQualityTab.sourceInvalid']);
  });

  it('clears a decision with nothing else filled in', () => {
    expect(messages({ status: 'PENDING', evidence: '', source_url: 'not a link', notes: '' })).toEqual([]);
  });
});

describe('leadEvidenceDefaults', () => {
  it('starts a fresh item as Verified and prefills a recorded decision', () => {
    expect(leadEvidenceDefaults()).toEqual({ status: 'VERIFIED', evidence: '', source_url: '', notes: '' });
    expect(leadEvidenceDefaults(null).status).toBe('VERIFIED');
    expect(leadEvidenceDefaults({ status: 'FAILED', evidence: 'Closed', source_url: 'https://a.in', notes: 'n' })).toEqual({
      status: 'FAILED',
      evidence: 'Closed',
      source_url: 'https://a.in',
      notes: 'n',
    });
    expect(leadEvidenceDefaults({ status: 'PENDING', evidence: '', source_url: '', notes: '' }).status).toBe('VERIFIED');
  });
});

describe('leadEvidenceDecision', () => {
  it('sends only the item and PENDING when clearing', () => {
    expect(leadEvidenceDecision('maps', { status: 'PENDING', evidence: 'x', source_url: 'y', notes: 'z' })).toEqual({
      item_key: 'maps',
      status: 'PENDING',
    });
  });

  it('trims the decision and leaves empty optional fields out', () => {
    expect(leadEvidenceDecision('maps', { status: 'VERIFIED', evidence: ' Listed ', source_url: ' ', notes: '' })).toEqual({
      item_key: 'maps',
      status: 'VERIFIED',
      evidence: 'Listed',
      source_url: null,
      notes: null,
    });
    expect(
      leadEvidenceDecision('maps', { status: 'FAILED', evidence: 'Closed', source_url: ' https://a.in ', notes: ' n ' }),
    ).toEqual({ item_key: 'maps', status: 'FAILED', evidence: 'Closed', source_url: 'https://a.in', notes: 'n' });
  });
});
