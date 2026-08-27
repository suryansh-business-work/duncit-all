/**
 * Both cards report a failed submission through this, so both branches are
 * pinned here rather than left to whichever transport a component test happens
 * to reject with.
 */
import { describe, expect, it } from 'vitest';

import { submissionErrorMessage } from '../src';

const FALLBACK = 'Could not submit the document.';

describe('submissionErrorMessage', () => {
  it('prefers the server message — it names the actual problem', () => {
    expect(submissionErrorMessage(new Error('Pincode does not match the city'), FALLBACK)).toBe(
      'Pincode does not match the city',
    );
  });

  it('falls back when the rejection is not an Error at all', () => {
    expect(submissionErrorMessage('boom', FALLBACK)).toBe(FALLBACK);
    expect(submissionErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(submissionErrorMessage({ status: 500 }, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back on an Error with an empty message, which would render as blank', () => {
    expect(submissionErrorMessage(new Error(''), FALLBACK)).toBe(FALLBACK);
  });
});
