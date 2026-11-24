import { afterEach, describe, expect, it, vi } from 'vitest';
import { STUDIO_OPTION_LIST } from '@duncit/utils';
import { sectionByRole } from '../../config/partner-sections';
import {
  activeStudioOption,
  localizedBadge,
  optionTooltip,
  readStudioMenuCollapsed,
  showsStudioMenu,
  STUDIO_MENU_COLLAPSED_KEY,
  writeStudioMenuCollapsed,
} from './studio-menu-state';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const ECOMM = STUDIO_OPTION_LIST.ECOMM;
const HOST = STUDIO_OPTION_LIST.HOST;
const keyOf = (...args: Parameters<typeof activeStudioOption>) => activeStudioOption(...args)?.key ?? null;

describe('activeStudioOption', () => {
  it('names the option whose own page is open', () => {
    expect(keyOf(ECOMM, '/ecomm-brand/warehouses', '')).toBe('warehouses');
    expect(keyOf(ECOMM, '/ecomm/dashboard', '')).toBe('dashboard');
    expect(keyOf(ECOMM, '/wallet', '')).toBe('withdrawal');
  });

  it('prefers the deepest option on a page beneath two of them', () => {
    // `/ecomm-brand` (Your brands) also contains this route; Orders is the closer one.
    expect(keyOf(ECOMM, '/ecomm-brand/orders/42', '')).toBe('orders');
    // A brand's own pages belong to no deeper option, so they stay under Your brands.
    expect(keyOf(ECOMM, '/ecomm-brand/b1/edit', '')).toBe('brands');
  });

  it('gives an option that names a query the page only while the query is there', () => {
    expect(keyOf(HOST, '/host/pods', '')).toBe('pods');
    expect(keyOf(HOST, '/host/pods', '?new=1')).toBe('create');
  });

  it('names nothing on a page no option leads to, and does not match a look-alike prefix', () => {
    expect(keyOf(ECOMM, '/earn', '')).toBeNull();
    expect(keyOf(ECOMM, '/ecomm-brandish', '')).toBeNull();
    expect(keyOf([], '/ecomm-brand', '')).toBeNull();
  });
});

describe('showsStudioMenu', () => {
  const ecomm = sectionByRole('ECOMM_MANAGER');
  if (!ecomm) throw new Error('the E-Commerce section is missing from PARTNER_SECTIONS');

  it('sits beside every page of the studio', () => {
    expect(showsStudioMenu(ecomm, ECOMM, '/ecomm-brand/warehouses')).toBe(true);
    expect(showsStudioMenu(ecomm, ECOMM, '/ecomm-brand/b1/products/new')).toBe(true);
  });

  it('sits beside the account pages its options open', () => {
    expect(showsStudioMenu(ecomm, ECOMM, '/wallet')).toBe(true);
    expect(showsStudioMenu(ecomm, ECOMM, '/verification')).toBe(true);
  });

  it('is absent from the Options page, which is the same list in full', () => {
    expect(showsStudioMenu(ecomm, ECOMM, '/ecomm/options')).toBe(false);
  });

  it('is absent from pages outside the studio, and when the studio has no options to list', () => {
    expect(showsStudioMenu(ecomm, ECOMM, '/earn')).toBe(false);
    expect(showsStudioMenu(ecomm, ECOMM, '/host/pods')).toBe(false);
    expect(showsStudioMenu(ecomm, [], '/ecomm-brand/warehouses')).toBe(false);
  });
});

describe('the remembered minimised choice', () => {
  it('is unknown until the partner chooses, then reads back what they chose', () => {
    expect(readStudioMenuCollapsed()).toBeNull();
    writeStudioMenuCollapsed(true);
    expect(localStorage.getItem(STUDIO_MENU_COLLAPSED_KEY)).toBe('1');
    expect(readStudioMenuCollapsed()).toBe(true);
    writeStudioMenuCollapsed(false);
    expect(readStudioMenuCollapsed()).toBe(false);
  });

  it('treats a value it never wrote as no choice', () => {
    localStorage.setItem(STUDIO_MENU_COLLAPSED_KEY, 'yes');
    expect(readStudioMenuCollapsed()).toBeNull();
  });

  it('falls back to no choice, without throwing, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is blocked');
    });
    expect(readStudioMenuCollapsed()).toBeNull();
    expect(() => writeStudioMenuCollapsed(true)).not.toThrow();
  });
});

describe('the studio menu badge', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) => `${options?.vars?.count} ${key}`;

  it('fills the count into the hover words', () => {
    expect(localizedBadge({ count: 3, labelKey: 'shell.nav.waitingForYourAction' }, t)).toEqual({
      count: 3,
      labelKey: 'shell.nav.waitingForYourAction',
      label: '3 shell.nav.waitingForYourAction',
    });
  });

  it('keeps a badge that already has its words, and drops one with nothing waiting', () => {
    expect(localizedBadge({ count: 2, label: 'two' }, t)).toEqual({ count: 2, label: 'two' });
    expect(localizedBadge({ count: 0, labelKey: 'k' }, t)).toBeNull();
    expect(localizedBadge(null, t)).toBeNull();
    expect(localizedBadge(undefined, t)).toBeNull();
  });

  it('names the entry on the icon rail, with what waits behind it', () => {
    expect(optionTooltip('Requests', '3 waiting', true)).toEqual({ title: 'Requests (3 waiting)', describes: false });
    expect(optionTooltip('Requests', undefined, true)).toEqual({ title: 'Requests', describes: false });
  });

  it('only says what waits while the words show, describing the link rather than renaming it', () => {
    expect(optionTooltip('Requests', '3 waiting', false)).toEqual({ title: '3 waiting', describes: true });
    expect(optionTooltip('Requests', undefined, false)).toEqual({ title: '', describes: true });
  });
});
