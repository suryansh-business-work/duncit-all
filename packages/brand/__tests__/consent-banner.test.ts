// @vitest-environment jsdom
import { CONSENT_COOKIE, makeConsent, OPTIONAL_STORAGE_KEYS, readWebConsent, writeWebConsent } from '@duncit/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_BANNER_KEYS,
  consentBannerCopy,
  mountConsentBanner,
  type ConsentBannerCopy,
} from '../src/consent-banner';

const copy = consentBannerCopy((key) => `[${key}]`);

const banner = () => document.querySelector('.duncit-consent') as HTMLElement;
const buttons = () => [...banner().querySelectorAll<HTMLButtonElement>('button')];
const byText = (text: string) => buttons().find((b) => b.textContent === text) as HTMLButtonElement;
const checkbox = (name: string) => banner().querySelector(`input[name=${name}]`) as HTMLInputElement;
const cookieNames = () => document.cookie.split(';').map((c) => c.trim().split('=')[0]);

const clearCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0`;
};

let listenerSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  clearCookie(CONSENT_COOKIE);
  for (const name of cookieNames()) if (name) clearCookie(name);
  localStorage.clear();
  listenerSpy = vi.spyOn(document, 'addEventListener');
});

afterEach(() => {
  for (const [type, listener] of listenerSpy.mock.calls) {
    document.removeEventListener(type, listener as EventListener);
  }
  vi.restoreAllMocks();
});

describe('consentBannerCopy', () => {
  it('resolves every line through the translator by its privacy.* key', () => {
    expect(copy.title).toBe('[privacy.banner.title]');
    expect(copy.analyticsBody).toBe('[privacy.categories.analytics.body]');
    expect(Object.keys(copy).sort()).toEqual(Object.keys(CONSENT_BANNER_KEYS).sort());
  });
});

describe('mountConsentBanner first visit', () => {
  it('shows itself with nothing ticked and reject as prominent as accept', () => {
    mountConsentBanner(copy, { policyUrl: '/policy/privacy' });
    expect(banner().hidden).toBe(false);
    expect(banner().getAttribute('aria-labelledby')).toBe('duncit-consent-title');
    expect(document.getElementById('duncit-consent-title')?.textContent).toBe(copy.title);
    expect(checkbox('analytics').checked).toBe(false);
    expect(checkbox('marketing').checked).toBe(false);
    const essential = banner().querySelector('input:disabled') as HTMLInputElement;
    expect(essential.checked).toBe(true);
    expect(byText(copy.acceptAll).className).toBe(byText(copy.rejectAll).className);
    expect(banner().querySelector('a')?.getAttribute('href')).toBe('/policy/privacy');
    expect(banner().querySelector('fieldset')?.hidden).toBe(true);
  });

  it('adds its stylesheet once even when mounted twice', () => {
    mountConsentBanner(copy, { policyUrl: '/p' });
    mountConsentBanner(copy, { policyUrl: '/p' });
    expect(document.head.querySelectorAll('#duncit-consent-style')).toHaveLength(1);
  });

  it('accept all stores analytics and marketing and hides the banner', () => {
    mountConsentBanner(copy, { policyUrl: '/p' });
    byText(copy.acceptAll).click();
    expect(banner().hidden).toBe(true);
    expect(readWebConsent()).toMatchObject({ analytics: true, marketing: true });
  });

  it('reject all stores a refusal, wipes marketing storage and GA cookies', () => {
    const [marketingKey] = OPTIONAL_STORAGE_KEYS.marketing;
    localStorage.setItem(marketingKey, 'x');
    document.cookie = '_ga=1; path=/';
    document.cookie = '_ga_ABC=1; path=/';
    document.cookie = 'keep=1; path=/';
    mountConsentBanner(copy, { policyUrl: '/p' });
    byText(copy.rejectAll).click();
    expect(readWebConsent()).toMatchObject({ analytics: false, marketing: false });
    expect(localStorage.getItem(marketingKey)).toBeNull();
    expect(cookieNames()).not.toContain('_ga');
    expect(cookieNames()).not.toContain('_ga_ABC');
    expect(cookieNames()).toContain('keep');
  });

  it('customise reveals the choices, then saves the ticked categories', () => {
    mountConsentBanner(copy, { policyUrl: '/p' });
    const customise = byText(copy.customise);
    expect(customise.getAttribute('aria-expanded')).toBe('false');
    customise.click();
    expect(banner().querySelector('fieldset')?.hidden).toBe(false);
    expect(customise.textContent).toBe(copy.save);
    expect(customise.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(checkbox('analytics'));
    checkbox('analytics').checked = true;
    customise.click();
    expect(readWebConsent()).toMatchObject({ analytics: true, marketing: false });
    expect(banner().hidden).toBe(true);
  });

  it('keeps GA cookies when analytics stays allowed', () => {
    document.cookie = '_ga=1; path=/';
    mountConsentBanner(copy, { policyUrl: '/p' });
    byText(copy.customise).click();
    checkbox('analytics').checked = true;
    byText(copy.save).click();
    expect(cookieNames()).toContain('_ga');
  });
});

describe('mountConsentBanner returning visitor', () => {
  it('stays hidden when a current answer exists', () => {
    writeWebConsent(makeConsent({ analytics: true, marketing: false }));
    mountConsentBanner(copy, { policyUrl: '/p' });
    expect(banner().hidden).toBe(true);
  });

  it('reopens from [data-consent-open] pre-filled with the stored choice', () => {
    writeWebConsent(makeConsent({ analytics: true, marketing: false }));
    document.body.innerHTML = '<a href="#" data-consent-open id="open"><span id="inner">Privacy choices</span></a>';
    mountConsentBanner(copy, { policyUrl: '/p' });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    (document.getElementById('inner') as HTMLElement).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(banner().hidden).toBe(false);
    expect(checkbox('analytics').checked).toBe(true);
    expect(checkbox('marketing').checked).toBe(false);
    expect(document.activeElement).toBe(byText(copy.acceptAll));
  });

  it('reopens unticked when the stored answer has expired or is missing', () => {
    document.body.innerHTML = '<a data-consent-open id="open">Privacy</a>';
    mountConsentBanner(copy, { policyUrl: '/p' });
    byText(copy.acceptAll).click();
    clearCookie(CONSENT_COOKIE);
    (document.getElementById('open') as HTMLElement).click();
    expect(banner().hidden).toBe(false);
    expect(checkbox('analytics').checked).toBe(false);
  });

  it('ignores clicks elsewhere and clicks with a non-element target', () => {
    writeWebConsent(makeConsent({ analytics: false, marketing: false }));
    document.body.innerHTML = '<p id="other">x</p>';
    mountConsentBanner(copy, { policyUrl: '/p' });
    (document.getElementById('other') as HTMLElement).click();
    expect(banner().hidden).toBe(true);
    document.dispatchEvent(new Event('click'));
    expect(banner().hidden).toBe(true);
  });
});

describe('mountConsentBanner copy', () => {
  it('labels the essential row as always on', () => {
    const custom: ConsentBannerCopy = { ...copy, essentialTitle: 'Essential', alwaysOn: 'Always on' };
    mountConsentBanner(custom, { policyUrl: '/p' });
    expect(banner().textContent).toContain('Essential · Always on');
  });
});
