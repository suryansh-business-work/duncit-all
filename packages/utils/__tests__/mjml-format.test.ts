import { describe, expect, it } from 'vitest';
import { formatMjml } from '../src/mjml-format';

describe('formatMjml', () => {
  it('re-indents MJML by nesting depth (splitting on whitespace between tags)', () => {
    const out = formatMjml(
      '<mjml> <mj-body> <mj-section> <mj-column> </mj-column> </mj-section> </mj-body> </mjml>',
    );
    expect(out).toBe(
      [
        '<mjml>',
        '  <mj-body>',
        '    <mj-section>',
        '      <mj-column>',
        '      </mj-column>',
        '    </mj-section>',
        '  </mj-body>',
        '</mjml>',
      ].join('\n'),
    );
  });

  it('treats self-closing tags as leaves (no extra indent) and drops blank lines', () => {
    const out = formatMjml('<mjml>\n\n  <mj-body>\n<mj-divider />\n</mj-body>\n</mjml>');
    expect(out).toBe(
      ['<mjml>', '  <mj-body>', '    <mj-divider />', '  </mj-body>', '</mjml>'].join('\n'),
    );
  });

  it('never lets depth go negative on stray closing tags', () => {
    expect(formatMjml('</mj-column>')).toBe('</mj-column>');
  });
});
