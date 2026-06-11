import { generatePolicyPdf, policyHtmlToText } from '../../policy.pdf';

describe('policyHtmlToText', () => {
  it('strips tags, keeps paragraph breaks and decodes entities', () => {
    const html =
      '<h2>Refunds</h2><p>Full refund &amp; no questions.</p><ul><li>Item one</li><li>Item&nbsp;two</li></ul>';
    const text = policyHtmlToText(html);
    expect(text).toContain('Refunds');
    expect(text).toContain('Full refund & no questions.');
    expect(text).toContain('• Item one');
    expect(text).toContain('• Item two');
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it('handles empty input', () => {
    expect(policyHtmlToText('')).toBe('');
  });
});

describe('generatePolicyPdf', () => {
  it('renders a non-empty PDF buffer with the %PDF header', async () => {
    const pdf = await generatePolicyPdf({
      brand: 'Duncit',
      title: 'Privacy Policy',
      content_html: '<p>We respect your privacy.</p>',
      updated_at: new Date().toISOString(),
    });
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders a placeholder when the policy has no content', async () => {
    const pdf = await generatePolicyPdf({ brand: 'Duncit', title: 'Empty', content_html: '' });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
