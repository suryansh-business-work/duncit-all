import { describe, expect, it } from 'vitest';
import { previewDocument } from '../../src/pages/email-fragments-page/queries';

const BODY = '<mjml>\n<mj-body background-color="#fff">\n<mj-section>BODY</mj-section>\n</mj-body>\n</mjml>';

describe('previewDocument', () => {
  it('puts the header just inside mj-body and the footer just before its close', () => {
    expect(previewDocument(BODY, '<mj-section>HEAD</mj-section>', '<mj-section>FOOT</mj-section>')).toBe(
      '<mjml>\n<mj-body background-color="#fff">\n' +
        '<mj-section>HEAD</mj-section>' +
        '\n\n<mj-section>BODY</mj-section>\n\n' +
        '<mj-section>FOOT</mj-section>' +
        '\n</mj-body>\n</mjml>',
    );
  });

  it('finds the body tag whatever its case', () => {
    const out = previewDocument('<MJML><MJ-BODY><p>x</p></MJ-BODY></MJML>', 'H', 'F');
    expect(out).toBe('<MJML><MJ-BODY>\nH\n<p>x</p>\nF\n</MJ-BODY></MJML>');
  });

  it('does not mistake mj-body-like tags for the body', () => {
    const body = '<mjml><mj-bodyguard></mj-bodyguard></mjml>';
    expect(previewDocument(body, 'H', 'F')).toBe(body);
  });

  it('returns the body untouched when it has no mj-body at all', () => {
    expect(previewDocument('<mjml></mjml>', 'H', 'F')).toBe('<mjml></mjml>');
    expect(previewDocument('', 'H', 'F')).toBe('');
  });

  it('returns the body untouched when mj-body is never closed', () => {
    const open = '<mjml><mj-body><p>x</p></mjml>';
    expect(previewDocument(open, 'H', 'F')).toBe(open);
  });

  it('returns the body untouched when the opening tag is cut off', () => {
    const cut = '<mjml><mj-body';
    expect(previewDocument(cut, 'H', 'F')).toBe(cut);
  });
});
