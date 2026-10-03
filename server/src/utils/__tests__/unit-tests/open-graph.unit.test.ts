/**
 * Reading a page's link-preview tags.
 *
 * What is held here is that the card comes out the way an unfurler would read
 * it — whichever attribute order or quote style the page used, entities
 * decoded once, relative images made absolute — and that the fetch never
 * reaches a private address, however the URL dresses it up.
 */
jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

import { lookup } from 'node:dns/promises';
import { fetchOpenGraph, parseOpenGraph, UNFURL_HEADER } from '@utils/open-graph';
import { decodeHtmlEntities } from '@utils/html';
import { isNonPublicAddress, isNonPublicHost } from '@utils/public-host';

const page = new URL('https://partner.example.org/offer/summer');
const lookupMock = lookup as unknown as jest.Mock;

describe('parseOpenGraph', () => {
  it('reads og tags in either attribute order and either quote style', () => {
    const html = `<head>
      <meta property="og:title" content="Sunset Yoga">
      <meta content='Bring a mat' property='og:description'>
      <meta property="og:image" content="https://cdn.example.org/yoga.jpg" />
      <meta property="og:site_name" content="Partner Studio">
    </head>`;
    expect(parseOpenGraph(html, page)).toEqual({
      title: 'Sunset Yoga',
      description: 'Bring a mat',
      image: 'https://cdn.example.org/yoga.jpg',
      site_name: 'Partner Studio',
    });
  });

  it('keeps an apostrophe inside a double-quoted value', () => {
    const html = `<meta property="og:title" content="Duncit's Sunday run">`;
    expect(parseOpenGraph(html, page).title).toBe("Duncit's Sunday run");
  });

  it('falls back to twitter tags, then the plain description and the title element', () => {
    const html = `<title>Plain &amp; simple</title>
      <meta name="description" content="Meta description">
      <meta name="twitter:image" content="/img/card.png">`;
    expect(parseOpenGraph(html, page)).toEqual({
      title: 'Plain & simple',
      description: 'Meta description',
      image: 'https://partner.example.org/img/card.png',
      site_name: null,
    });
  });

  it('decodes entities once, so writing them back out never doubles them', () => {
    const html = `<meta property="og:title" content="Chai &amp; Chess &#8212; Pune">`;
    expect(parseOpenGraph(html, page).title).toBe('Chai & Chess — Pune');
  });

  it('drops an image that is not http(s)', () => {
    const html = `<meta property="og:title" content="x"><meta property="og:image" content="javascript:alert(1)">`;
    expect(parseOpenGraph(html, page).image).toBeNull();
  });

  it('takes the first value when a tag repeats, and nulls when nothing is there', () => {
    const html = `<meta property="og:title" content="First"><meta property="og:title" content="Second">`;
    expect(parseOpenGraph(html, page).title).toBe('First');
    expect(parseOpenGraph('<p>no head</p>', page)).toEqual({
      title: null,
      description: null,
      image: null,
      site_name: null,
    });
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hex entities and leaves unknown ones alone', () => {
    expect(decodeHtmlEntities('&lt;b&gt; &quot;x&quot; &#39;y&#x27; &bogus;')).toBe(`<b> "x" 'y' &bogus;`);
  });
});

describe('public-host', () => {
  it('refuses private names and addresses', () => {
    for (const host of ['localhost', '127.0.0.1', '10.0.0.4', '169.254.169.254', 'printer.local', '[::1]']) {
      expect(isNonPublicHost(host)).toBe(true);
    }
    expect(isNonPublicHost('duncit.com')).toBe(false);
  });

  it('judges a resolved address by its family', () => {
    expect(isNonPublicAddress('192.168.1.10', 4)).toBe(true);
    expect(isNonPublicAddress('fd00::1', 6)).toBe(true);
    expect(isNonPublicAddress('::ffff:127.0.0.1', 6)).toBe(true);
    expect(isNonPublicAddress('93.184.216.34', 4)).toBe(false);
    expect(isNonPublicAddress('2606:2800:220:1::1', 6)).toBe(false);
  });
});

describe('fetchOpenGraph', () => {
  const realFetch = globalThis.fetch;
  let fetchMock: jest.Mock;

  const htmlResponse = (html: string) =>
    new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    lookupMock.mockReset().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it('reads the page, marked as our own unfurl', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<meta property="og:title" content="Offer"></head>'));
    const tags = await fetchOpenGraph('https://partner.example.org/offer');
    expect(tags.title).toBe('Offer');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers[UNFURL_HEADER]).toBe('1');
  });

  it('follows a redirect and resolves the image against the final page', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/landing' } }))
      .mockResolvedValueOnce(
        htmlResponse('<meta property="og:title" content="Landing"><meta property="og:image" content="hero.png">'),
      );
    const tags = await fetchOpenGraph('https://partner.example.org/go');
    expect(fetchMock.mock.calls[1][0].toString()).toBe('https://partner.example.org/landing');
    expect(tags.image).toBe('https://partner.example.org/hero.png');
  });

  it('never requests a private host, even when a public page redirects to one', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 301, headers: { location: 'http://169.254.169.254/latest' } }),
    );
    const tags = await fetchOpenGraph('https://partner.example.org/go');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tags.title).toBeNull();
  });

  it('refuses a public name that resolves to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '10.0.0.7', family: 4 }]);
    const tags = await fetchOpenGraph('https://rebind.example.org/');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tags.title).toBeNull();
  });

  it('answers an empty card for a page that is not HTML, a bad URL, or a network error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { headers: { 'content-type': 'application/json' } }));
    expect((await fetchOpenGraph('https://partner.example.org/api')).title).toBeNull();
    expect((await fetchOpenGraph('not a url')).title).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect((await fetchOpenGraph('https://partner.example.org/')).title).toBeNull();
  });
});
