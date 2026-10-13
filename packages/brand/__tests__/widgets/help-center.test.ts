// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../src/widgets/help-center';
import { flush, stubFetch, stubFetchReject } from './helpers';

const copy = { empty: 'No topics', error: 'Failed', general: 'General', one: 'question', many: 'questions' };

function build(withSearch = true): HTMLElement {
  document.body.innerHTML = `${withSearch ? '<input data-help-search/>' : ''}
    <div id="r" data-graphql-url="https://api.test/gql" data-copy='${JSON.stringify(copy)}'></div>`;
  return document.getElementById('r') as HTMLElement;
}

afterEach(() => vi.unstubAllGlobals());

const groups = {
  data: {
    publicFaqGroups: [
      { super_category: { name: 'Payments', slug: 'pay ments' }, faqs: [{}, {}] },
      { super_category: null, faqs: [{}] },
      { super_category: { name: 'Hidden', slug: 'h' }, faqs: [] },
    ],
  },
};

describe('help-center mount', () => {
  it('renders one card per non-empty topic with count nouns and links', async () => {
    const root = build();
    stubFetch(groups);
    mount(root);
    await flush();
    const cards = root.querySelectorAll<HTMLAnchorElement>('[data-topic-card]');
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('href')).toBe('/faq#pay%20ments');
    expect(cards[0].textContent).toContain('Payments');
    expect(cards[0].textContent).toContain('2 questions');
    expect(cards[1].getAttribute('href')).toBe('/faq');
    expect(cards[1].textContent).toContain('General');
    expect(cards[1].textContent).toContain('1 question');
    expect(cards[1].textContent).not.toContain('1 questions');
  });

  it('wraps the icon list after six topics', async () => {
    const root = build();
    const many = Array.from({ length: 7 }, (_, i) => ({ super_category: { name: `T${i}`, slug: `t${i}` }, faqs: [{}] }));
    stubFetch({ data: { publicFaqGroups: many } });
    mount(root);
    await flush();
    const icons = [...root.querySelectorAll('i')].map((i) => i.className);
    expect(icons[6]).toBe(icons[0]);
    expect(icons[1]).not.toBe(icons[0]);
  });

  it('filters cards by the search term, case-insensitively, and restores them', async () => {
    const root = build();
    stubFetch(groups);
    mount(root);
    await flush();
    const search = document.querySelector('input') as HTMLInputElement;
    const cards = root.querySelectorAll<HTMLElement>('[data-topic-card]');
    search.value = '  PAY ';
    search.dispatchEvent(new Event('input'));
    expect(cards[0].style.display).toBe('');
    expect(cards[1].style.display).toBe('none');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(cards[1].style.display).toBe('');
  });

  it('hides a card that carries no topic name once a term is typed', async () => {
    const root = build();
    stubFetch(groups);
    mount(root);
    await flush();
    const stray = document.createElement('a');
    stray.setAttribute('data-topic-card', '');
    root.appendChild(stray);
    const search = document.querySelector('input') as HTMLInputElement;
    search.value = 'pay';
    search.dispatchEvent(new Event('input'));
    expect(stray.style.display).toBe('none');
  });

  it('shows the empty copy when nothing is published', async () => {
    const root = build();
    stubFetch({ data: { publicFaqGroups: [] } });
    mount(root);
    await flush();
    expect(root.textContent).toBe('No topics');
  });

  it('shows the empty copy when the body has no data', async () => {
    const root = build(false);
    stubFetch(null);
    mount(root);
    await flush();
    expect(root.textContent).toBe('No topics');
  });

  it('shows the error copy on a network failure', async () => {
    const root = build();
    stubFetchReject();
    mount(root);
    await flush();
    expect(root.textContent).toBe('Failed');
  });

  it('is idempotent per root and tolerates missing attributes', async () => {
    document.body.innerHTML = '<div id="r"></div>';
    const root = document.getElementById('r') as HTMLElement;
    const fetchMock = stubFetch({ data: { publicFaqGroups: [] } });
    mount(root);
    mount(root);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });
});
