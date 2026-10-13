// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFaqGroups } from '../../src/widgets/faq-list';
import { stubFetch, stubFetchReject } from './helpers';

const copy = { empty: 'No FAQs', error: 'Could not load' };

function root(): HTMLElement {
  document.body.innerHTML = `<div id="r" data-graphql-url="https://api.test/gql" data-copy='${JSON.stringify(copy)}'>skeleton</div>`;
  return document.getElementById('r') as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = '';
});

describe('loadFaqGroups', () => {
  it('renders groups with their heading and opens only the first question', async () => {
    const r = root();
    stubFetch({
      data: {
        publicFaqGroups: [
          {
            super_category: { name: 'Pods & More', slug: 'pods' },
            faqs: [
              { question: 'Q1 <b>', answer: 'A1' },
              { question: 'Q2', answer: 'A2' },
            ],
          },
          { super_category: null, faqs: [{ question: 'Q3', answer: 'A3' }] },
          { super_category: { name: 'Empty', slug: 'e' }, faqs: [] },
          { super_category: { name: 'Null', slug: 'n' }, faqs: null },
        ],
      },
    });
    await loadFaqGroups(r);
    expect(r.querySelectorAll('section')).toHaveLength(2);
    expect(r.querySelector('h2#pods')?.textContent).toBe('Pods & More');
    expect(r.querySelectorAll('h2')).toHaveLength(1);
    const details = r.querySelectorAll('details');
    expect(details).toHaveLength(3);
    expect(details[0].hasAttribute('open')).toBe(true);
    expect(details[1].hasAttribute('open')).toBe(false);
    expect(details[0].querySelector('span')?.innerHTML).toBe('Q1 &lt;b&gt;');
  });

  it('shows the empty copy when no group has questions', async () => {
    const r = root();
    stubFetch({ data: { publicFaqGroups: [{ super_category: null, faqs: [] }] } });
    await loadFaqGroups(r);
    expect(r.textContent).toBe('No FAQs');
  });

  it('shows the empty copy when the response has no data', async () => {
    const r = root();
    stubFetch(null);
    await loadFaqGroups(r);
    expect(r.textContent).toBe('No FAQs');
  });

  it('shows the error copy when the request fails', async () => {
    const r = root();
    stubFetchReject();
    await loadFaqGroups(r);
    expect(r.textContent).toBe('Could not load');
  });

  it('scrolls to a decoded #slug deep link once rendered', async () => {
    const r = root();
    window.location.hash = '#pods%20x';
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    stubFetch({
      data: { publicFaqGroups: [{ super_category: { name: 'P', slug: 'pods x' }, faqs: [{ question: 'q', answer: 'a' }] }] },
    });
    await loadFaqGroups(r);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('does not throw when the deep link target is missing', async () => {
    const r = root();
    window.location.hash = '#nothing';
    stubFetch({
      data: { publicFaqGroups: [{ super_category: { name: 'P', slug: 'p' }, faqs: [{ question: 'q', answer: 'a' }] }] },
    });
    await loadFaqGroups(r);
    expect(r.querySelectorAll('details')).toHaveLength(1);
  });

  it('uses empty url and copy defaults when attributes are missing', async () => {
    document.body.innerHTML = '<div id="r"></div>';
    const r = document.getElementById('r') as HTMLElement;
    const fetchMock = stubFetch({ data: { publicFaqGroups: [] } });
    await loadFaqGroups(r);
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });
});
