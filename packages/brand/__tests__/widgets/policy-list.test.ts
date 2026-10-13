// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../src/widgets/policy-list';
import { flush, stubFetch, stubFetchReject } from './helpers';

const copy = {
  readCurrent: 'Read current',
  showAll: 'Show all',
  empty: 'No policies',
  error: 'Failed',
  matchOne: 'match for',
  matchMany: 'matches for',
  nothingMatches: 'Nothing matches',
};

function build(extras = true): HTMLElement {
  document.body.innerHTML = `${
    extras
      ? '<div data-policy-search-wrap class="hidden"><input data-policy-search/></div><p data-policy-count></p>'
      : ''
  }<div id="r" data-graphql-url="https://api.test/gql" data-copy='${JSON.stringify(copy)}'></div>`;
  return document.getElementById('r') as HTMLElement;
}

const policies = {
  data: {
    publicPolicies: [
      { slug: 'privacy-policy', title: 'Privacy Policy' },
      { slug: 'data-deletion', title: 'Account Removal <b>' },
      { slug: 'terms', title: 'Terms of Use' },
    ],
  },
};

const type = (value: string) => {
  const input = document.querySelector('input') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

afterEach(() => vi.unstubAllGlobals());

describe('policy-list mount', () => {
  it('renders a card per policy, escaped, and reveals the search', async () => {
    const root = build();
    stubFetch(policies);
    mount(root);
    await flush();
    const links = root.querySelectorAll('a');
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toBe('/policy/privacy-policy');
    expect(links[1].textContent).toContain('Account Removal <b>');
    expect(root.querySelector('b')).toBeNull();
    expect(links[0].textContent).toContain('Read current');
    expect(document.querySelector('[data-policy-search-wrap]')?.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('[data-policy-count]')?.textContent).toBe('');
  });

  it('filters by title and shows a plural count', async () => {
    const root = build();
    stubFetch(policies);
    mount(root);
    await flush();
    type('  POLIC ');
    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(document.querySelector('[data-policy-count]')?.textContent).toBe('1 match for “POLIC”');
    type('t');
    expect(document.querySelector('[data-policy-count]')?.textContent).toBe('2 matches for “t”');
  });

  it('also matches the slug with dashes read as spaces', async () => {
    const root = build();
    stubFetch(policies);
    mount(root);
    await flush();
    type('data deletion');
    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/policy/data-deletion');
  });

  it('shows a way out when nothing matches and clears the search on click', async () => {
    const root = build();
    stubFetch(policies);
    mount(root);
    await flush();
    type('zzz<i>');
    expect(root.textContent).toContain('Nothing matches “zzz<i>”');
    expect(root.querySelector('i')).toBeNull();
    (root.querySelector('[data-clear-search]') as HTMLElement).click();
    expect((document.querySelector('input') as HTMLInputElement).value).toBe('');
    expect(root.querySelectorAll('a')).toHaveLength(3);
    expect(document.activeElement).toBe(document.querySelector('input'));
  });

  it('ignores clicks that are not on the clear button', async () => {
    const root = build();
    stubFetch(policies);
    mount(root);
    await flush();
    type('zzz');
    root.click();
    expect(root.textContent).toContain('Nothing matches');
  });

  it('clears and re-renders even when the page has no search field', async () => {
    const root = build(false);
    stubFetch(policies);
    mount(root);
    await flush();
    root.innerHTML = '<button data-clear-search>x</button>';
    (root.querySelector('button') as HTMLElement).click();
    expect(root.querySelectorAll('a')).toHaveLength(3);
  });

  it('shows the empty copy and keeps the search hidden when nothing is published', async () => {
    const root = build();
    stubFetch({ data: { publicPolicies: [] } });
    mount(root);
    await flush();
    expect(root.textContent).toBe('No policies');
    expect(document.querySelector('[data-policy-search-wrap]')?.classList.contains('hidden')).toBe(true);
  });

  it('treats a body without data as empty', async () => {
    const root = build(false);
    stubFetch(null);
    mount(root);
    await flush();
    expect(root.textContent).toBe('No policies');
  });

  it('shows the error copy when the request fails', async () => {
    const root = build();
    stubFetchReject();
    mount(root);
    await flush();
    expect(root.textContent).toBe('Failed');
  });

  it('mounts once per root and defaults a missing url to empty', async () => {
    document.body.innerHTML = '<div id="r"></div>';
    const root = document.getElementById('r') as HTMLElement;
    const fetchMock = stubFetch({ data: { publicPolicies: [] } });
    mount(root);
    mount(root);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });
});
