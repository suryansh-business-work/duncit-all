import { describe, expect, it } from 'vitest';
import {
  POLICY_PAGE_PATTERN,
  POLICY_READER_PATH,
  POLICY_READER_SLUG,
  policyPagePath,
} from './policy-page';

/** The slug the HTML server would answer for this address, or undefined. */
const slugOf = (pathname: string) => POLICY_PAGE_PATTERN.exec(pathname)?.[1];

describe('POLICY_PAGE_PATTERN', () => {
  it('reads the slug off a policy address, with or without a trailing slash', () => {
    expect(slugOf('/policy/privacy-policy')).toBe('privacy-policy');
    expect(slugOf('/policy/terms-of-service-2026/')).toBe('terms-of-service-2026');
    expect(slugOf('/policy/refunds')).toBe('refunds');
  });

  // The server's own slug rule: lowercase letters, digits and single dashes.
  it('refuses anything the server could never have minted as a slug', () => {
    expect(slugOf('/policy/Privacy')).toBeUndefined();
    expect(slugOf('/policy/-leading')).toBeUndefined();
    expect(slugOf('/policy/double--dash')).toBeUndefined();
    expect(slugOf('/policy/')).toBeUndefined();
    expect(slugOf('/policy/privacy/extra')).toBeUndefined();
    expect(slugOf('/blog/privacy')).toBeUndefined();
  });

  it('can never match the reader page, so the reader can never shadow a policy', () => {
    expect(slugOf(POLICY_READER_PATH)).toBeUndefined();
    expect(POLICY_READER_PATH).toBe(`/policy/${POLICY_READER_SLUG}`);
  });
});

describe('policyPagePath', () => {
  it('builds the address a renamed policy redirects to', () => {
    expect(policyPagePath('privacy-policy')).toBe('/policy/privacy-policy');
    expect(slugOf(policyPagePath('privacy-policy'))).toBe('privacy-policy');
  });
});
