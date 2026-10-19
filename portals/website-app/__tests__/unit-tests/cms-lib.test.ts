import { describe, expect, it } from 'vitest';
import { cmsErrorMessage, isConflict } from '../../src/pages/cms/lib/errors';
import { PLACEHOLDER_CSS, previewDocument } from '../../src/pages/cms/lib/preview';
import { makeSiteDesign } from '../mocks/cms.mock';

const v4 = (code: string, message = 'Server sentence') => ({ message: 'x', errors: [{ message, extensions: { code } }] });
const v3 = (code: string, message = 'Server sentence') => ({ message: 'x', graphQLErrors: [{ message, extensions: { code } }] });

describe('isConflict', () => {
  it('is true only when the server refused the save because someone else saved first', () => {
    expect(isConflict(v4('CONFLICT'))).toBe(true);
    expect(isConflict(v3('CONFLICT'))).toBe(true);
    expect(isConflict(v4('BAD_USER_INPUT'))).toBe(false);
    expect(isConflict(new Error('CONFLICT'))).toBe(false);
    expect(isConflict(null)).toBe(false);
  });
});

describe('cmsErrorMessage', () => {
  it("passes on the server's sentence for refusals the editor can act on", () => {
    expect(cmsErrorMessage(v4('NOT_FOUND', 'That page is gone.'), 'fallback')).toBe('That page is gone.');
    expect(cmsErrorMessage(v3('BAD_USER_INPUT', 'Pick a path.'), 'fallback')).toBe('Pick a path.');
  });

  it('uses the fallback for anything else, and for a refusal without a sentence', () => {
    expect(cmsErrorMessage(v4('INTERNAL_SERVER_ERROR', 'ECONNRESET'), 'fallback')).toBe('fallback');
    expect(cmsErrorMessage(v4('CONFLICT', ''), 'fallback')).toBe('fallback');
    expect(cmsErrorMessage(new Error('Failed to fetch'), 'fallback')).toBe('fallback');
  });
});

describe('previewDocument', () => {
  const base = { status: 200, title: 't', html: '<main>hi</main>', css: '.page{}', head_html: '', custom_js: '' };

  it('draws a page with no site design: just its own css, the placeholders and no font links', () => {
    const doc = previewDocument({ ...base, site: null });
    expect(doc).not.toContain('<link');
    expect(doc).toContain('<style>.page{}</style>');
    expect(doc).toContain(`<style>${PLACEHOLDER_CSS}</style>`);
    // Nothing but the page's css and the placeholders: no empty <style> for the missing design.
    expect(doc.match(/<style>/g)).toHaveLength(2);
    expect(doc).toContain('<body><main>hi</main></body>');
  });

  it("links the site's fonts and inlines its base css, tokens, font roles and site css before the page's own", () => {
    const design = { ...makeSiteDesign().design, base_css: 'body{margin:0}', font_urls: ['https://fonts.test/a.css?family="Odd"'] };
    const doc = previewDocument({ ...base, site: { design, custom_css: '.site{}' } });
    expect(doc).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap">');
    // A quote in a font url cannot end the href attribute.
    expect(doc).toContain('<link rel="stylesheet" href="https://fonts.test/a.css?family=&quot;Odd&quot;">');
    const order = ['body{margin:0}', ':root{--brand:#ff6600;}', '--font-heading:"Inter", sans-serif;', '.page{}', '.site{}', PLACEHOLDER_CSS].map((part) => doc.indexOf(part));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
