import { describe, expect, it } from 'vitest';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import {
  fragmentFilterOptions,
  templateSidebarItems,
} from '../../src/pages/email-templates-page/sidebar-items';
import { fragmentSidebarItems } from '../../src/pages/email-fragments-page/sidebar-items';
import type { TemplateUsage } from '../../src/pages/email-templates-page/queries';
import type { Fragment, FragmentTemplateRef } from '../../src/pages/email-fragments-page/queries';
import { makeTpl } from '../mocks/email-template.mock';

const t = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() }).t;

const usage = (slug: string, sent: number): TemplateUsage => ({
  slug,
  sent,
  skipped: 0,
  failed: 0,
  total: sent,
});

describe('templateSidebarItems', () => {
  const welcome = makeTpl({
    template_id: 't1',
    slug: 'welcome',
    name: 'Welcome',
    fragment_key: 'transactional',
    updated_at: '2026-02-01T00:00:00.000Z',
  });
  const receipt = makeTpl({
    template_id: 't2',
    slug: 'payment-receipt',
    name: 'Receipt',
    is_active: false,
  });

  it('carries the send count, the fragment and the timestamp the sorts need', () => {
    const [first] = templateSidebarItems(t, [welcome], new Map([['welcome', usage('welcome', 12)]]));

    expect(first).toMatchObject({
      key: 't1',
      primary: 'Welcome',
      secondary: 'welcome',
      off: false,
      count: 12,
      group: 'transactional',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
    expect(first.badge).toEqual({ label: '12', title: '12 sends recorded', muted: false });
  });

  /**
   * A template with no rows in the log is simply absent from the roll-up. It
   * still gets a zero, because "never sent" is the thing this list could not
   * show before — and "Most used" sorts it to the bottom rather than hiding it.
   */
  it('gives a template nothing has ever sent a muted zero', () => {
    const [row] = templateSidebarItems(t, [receipt], new Map());
    expect(row.count).toBe(0);
    expect(row.badge?.muted).toBe(true);
    expect(row.off).toBe(true);
  });

  it('leaves a template with no header/footer in the "any" bucket', () => {
    const [row] = templateSidebarItems(t, [receipt], new Map());
    expect(row.group).toBe('');
  });

  it('names the header/footer options as the Fragments page names them', () => {
    expect(
      fragmentFilterOptions([
        { key: 'transactional', name: 'Transactional', is_active: true },
        { key: 'billing', name: 'Billing', is_active: false },
      ])
    ).toEqual([
      { value: 'transactional', label: 'Transactional' },
      { value: 'billing', label: 'Billing' },
    ]);
  });
});

describe('fragmentSidebarItems', () => {
  const fragment = (key: string, name: string, over: Partial<Fragment> = {}): Fragment => ({
    fragment_id: key,
    key,
    name,
    is_system: true,
    header_mjml: '',
    footer_mjml: '',
    is_active: true,
    ...over,
  });

  const ref = (slug: string, fragment_key: string): FragmentTemplateRef => ({
    template_id: slug,
    slug,
    name: slug,
    fragment_key,
    is_active: true,
  });

  it('counts the templates each fragment is wrapped around', () => {
    const items = fragmentSidebarItems(
      t,
      [fragment('transactional', 'Transactional'), fragment('billing', 'Billing')],
      new Map([['transactional', [ref('welcome', 'transactional'), ref('reset', 'transactional')]]])
    );

    expect(items[0]).toMatchObject({ key: 'transactional', count: 2 });
    expect(items[0].badge).toEqual({
      label: '2',
      title: '2 templates use this header and footer',
      muted: false,
    });
    // A fragment nothing consumes is the one it is safe to edit — and the one
    // worth asking about. It shows its zero.
    expect(items[1]).toMatchObject({ key: 'billing', count: 0 });
    expect(items[1].badge?.muted).toBe(true);
  });

  it('marks a switched-off fragment and carries its timestamp', () => {
    const [row] = fragmentSidebarItems(
      t,
      [fragment('weekend', 'Weekend', { is_active: false, updated_at: '2026-05-05T00:00:00.000Z' })],
      new Map()
    );
    expect(row.off).toBe(true);
    expect(row.updatedAt).toBe('2026-05-05T00:00:00.000Z');
  });
});
