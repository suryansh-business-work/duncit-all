// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPolicySlug, mount, slugFromPath } from '../../src/widgets/policy-reader';
import { flush, stubFetch, stubFetchReject } from './helpers';

const copy = { notFound: 'Not found', empty: 'Empty policy', error: 'Failed' };

function build(slug?: string): HTMLElement {
  document.body.innerHTML = `<h1 id="h">Old</h1><div id="r" data-graphql-url="https://api.test/gql"
    data-copy='${JSON.stringify(copy)}' ${slug ? `data-policy-slug="${slug}"` : ''}></div>`;
  return document.getElementById('r') as HTMLElement;
}

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  replace = vi.fn();
  vi.stubGlobal('location', { pathname: '/policy/privacy-policy/', replace });
});
afterEach(() => vi.unstubAllGlobals());

describe('isPolicySlug', () => {
  it.each(['privacy', 'a-b-c', 'terms-2024', '9'])('accepts %s', (slug) => {
    expect(isPolicySlug(slug)).toBe(true);
  });
  it.each(['', '-a', 'a-', 'a--b', 'A', 'a_b', 'a b', 'é'])('rejects %j', (slug) => {
    expect(isPolicySlug(slug)).toBe(false);
  });
});

describe('slugFromPath', () => {
  it('takes the last segment', () => {
    expect(slugFromPath('/policy/privacy-policy')).toBe('privacy-policy');
  });
  it('allows one trailing slash', () => {
    expect(slugFromPath('/legal/terms/')).toBe('terms');
  });
  it('returns empty when the last segment is not a slug', () => {
    expect(slugFromPath('/policy/Not_A_Slug')).toBe('');
    expect(slugFromPath('/')).toBe('');
  });
});

describe('policy-reader mount', () => {
  it('loads the policy by the explicit slug, sets title, heading and trusted body', async () => {
    const root = build('terms');
    const fetchMock = stubFetch({ data: { policyBySlug: { title: 'Terms', content: '<p>Body</p>' } } });
    mount(root);
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ slug: 'terms' });
    expect(document.title).toBe('Terms — Duncit');
    expect(document.getElementById('h')?.textContent).toBe('Terms');
    expect(root.innerHTML).toBe('<p>Body</p>');
  });

  it('prefers [data-page-heading] over the first h1', async () => {
    const root = build('terms');
    document.body.insertAdjacentHTML('beforeend', '<h2 data-page-heading>Heading</h2>');
    stubFetch({ data: { policyBySlug: { title: 'Terms', content: 'x' } } });
    mount(root);
    await flush();
    expect(document.querySelector('[data-page-heading]')?.textContent).toBe('Terms');
    expect(document.getElementById('h')?.textContent).toBe('Old');
  });

  it('derives the slug from the address when the attribute is absent', async () => {
    const root = build();
    const fetchMock = stubFetch({ data: { policyBySlug: { title: 'P', content: 'c' } } });
    mount(root);
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ slug: 'privacy-policy' });
  });

  it('redirects to /policies when no valid slug is available', () => {
    vi.stubGlobal('location', { pathname: '/policy/Bad_One', replace });
    const root = build();
    const fetchMock = stubFetch({});
    mount(root);
    expect(replace).toHaveBeenCalledWith('/policies');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the empty copy for a policy without content, and no heading is fine', async () => {
    const root = build('terms');
    document.getElementById('h')?.remove();
    stubFetch({ data: { policyBySlug: { title: 'Terms', content: null } } });
    mount(root);
    await flush();
    expect(root.innerHTML).toBe('<p>Empty policy</p>');
  });

  it('shows not-found when the policy does not exist', async () => {
    const root = build('terms');
    stubFetch({ data: { policyBySlug: null } });
    mount(root);
    await flush();
    expect(root.innerHTML).toBe('<p>Not found</p>');
  });

  it('shows not-found for a body without data', async () => {
    const root = build('terms');
    stubFetch(null);
    mount(root);
    await flush();
    expect(root.innerHTML).toBe('<p>Not found</p>');
  });

  it('shows the error copy on a network failure', async () => {
    const root = build('terms');
    stubFetchReject();
    mount(root);
    await flush();
    expect(root.innerHTML).toBe('<p>Failed</p>');
  });

  it('mounts once per root and tolerates a missing url attribute', async () => {
    document.body.innerHTML = '<div id="r" data-policy-slug="terms"></div>';
    const root = document.getElementById('r') as HTMLElement;
    const fetchMock = stubFetch({ data: { policyBySlug: null } });
    mount(root);
    mount(root);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });
});
