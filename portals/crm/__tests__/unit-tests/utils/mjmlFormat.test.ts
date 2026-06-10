import { describe, expect, it } from 'vitest';
import { formatMjml } from '@/utils/mjmlFormat';

describe('formatMjml', () => {
  it('re-indents whitespace-separated MJML by nesting depth', () => {
    const input = '<mjml>\n<mj-body>\n<mj-section>\n<mj-column>\n<mj-text>Hi</mj-text>\n</mj-column>\n</mj-section>\n</mj-body>\n</mjml>';
    const lines = formatMjml(input).split('\n');
    expect(lines[0]).toBe('<mjml>');
    expect(lines[1]).toBe('  <mj-body>');
    expect(lines[2]).toBe('    <mj-section>');
    expect(lines[3]).toBe('      <mj-column>');
    expect(lines[4]).toBe('        <mj-text>Hi</mj-text>');
    expect(lines[lines.length - 1]).toBe('</mjml>');
  });

  it('keeps self-closing tags from increasing depth', () => {
    const input = '<mjml>\n<mj-body>\n<mj-image src="x" />\n<mj-divider />\n</mj-body>\n</mjml>';
    const lines = formatMjml(input).split('\n');
    expect(lines).toContain('    <mj-image src="x" />');
    expect(lines).toContain('    <mj-divider />');
    expect(lines[lines.length - 1]).toBe('</mjml>');
  });
});
