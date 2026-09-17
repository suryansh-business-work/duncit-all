import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import FragmentUsageStrip, {
  templateHref,
  templatesHref,
} from '../../src/pages/email-fragments-page/FragmentUsageStrip';
import type { FragmentTemplateRef } from '../../src/pages/email-fragments-page/queries';

const tpl = (name: string, slug: string): FragmentTemplateRef => ({
  template_id: slug,
  slug,
  name,
  fragment_key: 'transactional',
  is_active: true,
});

const renderStrip = (templates: FragmentTemplateRef[]) =>
  render(
    <MemoryRouter>
      <FragmentUsageStrip fragmentKey="transactional" templates={templates} />
    </MemoryRouter>
  );

describe('FragmentUsageStrip', () => {
  it('links its count at Templates, narrowed AND opened on the first one', () => {
    renderStrip([tpl('Welcome', 'welcome'), tpl('Receipt', 'payment-receipt')]);

    const count = screen.getByText('Used by 2 templates');
    expect(count.closest('a')).toHaveAttribute(
      'href',
      '/emails/templates?fragment=transactional&slug=welcome'
    );
  });

  it('links each named template to itself', () => {
    renderStrip([tpl('Welcome', 'welcome')]);
    expect(screen.getByText('Welcome').closest('a')).toHaveAttribute(
      'href',
      '/emails/templates?slug=welcome'
    );
  });

  /**
   * The count stays exact while the chips are capped — the count chip is the
   * way to see the rest, so a truncated row is never a lie about the number.
   */
  it('names at most eight, and still counts them all', () => {
    const many = Array.from({ length: 12 }, (_, i) => tpl(`Template ${i}`, `slug-${i}`));
    renderStrip(many);

    expect(screen.getByText('Used by 12 templates')).toBeInTheDocument();
    expect(screen.getByText('Template 7')).toBeInTheDocument();
    expect(screen.queryByText('Template 8')).toBeNull();
  });

  it('says plainly when nothing consumes it', () => {
    renderStrip([]);
    expect(
      screen.getByText('No template uses this header and footer yet.')
    ).toBeInTheDocument();
  });

  it('escapes keys and slugs that would otherwise break the query string', () => {
    expect(templatesHref('a b&c')).toBe('/emails/templates?fragment=a+b%26c');
    expect(templateHref('a b&c')).toBe('/emails/templates?slug=a+b%26c');
  });

  it('leaves the slug off when there is nothing to open', () => {
    expect(templatesHref('transactional')).toBe('/emails/templates?fragment=transactional');
  });
});
