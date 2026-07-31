import { TRACKING_PIXEL, instrumentCampaignHtml } from '../../tracking.service';

const wrap = (body: string) => `<html><body>${body}</body></html>`;
const run = (body: string) =>
  instrumentCampaignHtml(wrap(body), 'camp-1', 'https://server.duncit.com');

describe('instrumentCampaignHtml links', () => {
  it('routes every link through the tracker and records what it points at', () => {
    const result = run(
      '<a href="https://duncit.com/pods">Pods</a><a href="http://duncit.com/clubs">Clubs</a>',
    );
    expect(result.links.map((link) => link.url)).toEqual([
      'https://duncit.com/pods',
      'http://duncit.com/clubs',
    ]);
    expect(result.html).toContain('href="https://server.duncit.com/t/c/camp-1/0"');
    expect(result.html).toContain('href="https://server.duncit.com/t/c/camp-1/1"');
    expect(result.html).not.toContain('href="https://duncit.com/pods"');
  });

  // Two buttons pointing at the same page are one destination, not two.
  it('gives a repeated destination a single index', () => {
    const result = run('<a href="https://duncit.com/x">One</a><a href="https://duncit.com/x">Two</a>');
    expect(result.links).toHaveLength(1);
    expect(result.html.match(/t\/c\/camp-1\/0/g)).toHaveLength(2);
  });

  // MJML renders mj-button as an anchor carrying display:inline-block.
  it('tells a CTA button apart from a plain link and an unsubscribe', () => {
    const result = run(
      '<a href="https://duncit.com/plain">Plain</a>' +
        '<a href="https://duncit.com/book" style="display:inline-block;background:#414141;">Book</a>' +
        '<a href="https://duncit.com/unsubscribe?e=1">Stop these</a>' +
        '<a href="https://duncit.com/opt-out">Opt out</a>',
    );
    expect(result.links.map((link) => link.kind)).toEqual([
      'LINK',
      'CTA',
      'UNSUBSCRIBE',
      'UNSUBSCRIBE',
    ]);
  });

  // An opt-out styled as a button is still an opt-out.
  it('reads an unsubscribe destination ahead of the button styling', () => {
    const result = run(
      '<a href="https://duncit.com/unsubscribe" style="display:inline-block;">Stop</a>',
    );
    expect(result.links[0].kind).toBe('UNSUBSCRIBE');
  });

  it('does not rewrite a mailto or an in-page anchor', () => {
    const result = run('<a href="mailto:hi@duncit.com">Mail</a><a href="#top">Top</a>');
    expect(result.links).toEqual([]);
    expect(result.html).toContain('href="mailto:hi@duncit.com"');
    expect(result.html).toContain('href="#top"');
  });

  it('handles the multi-line anchor tags MJML actually emits', () => {
    const result = instrumentCampaignHtml(
      wrap('<a\n   href="https://duncit.com/x" style="display:inline-block;"\n >Book</a>'),
      'camp-1',
      'https://server.duncit.com',
    );
    expect(result.links).toEqual([
      { url: 'https://duncit.com/x', kind: 'CTA' },
    ]);
    expect(result.html).toContain('href="https://server.duncit.com/t/c/camp-1/0"');
  });
});

describe('instrumentCampaignHtml images', () => {
  it('proxies every remote image so a loaded picture proves an open', () => {
    const result = run('<img src="https://cdn.duncit.com/a.png" /><img src="https://cdn.duncit.com/b.png" />');
    expect(result.images.map((image) => image.url)).toEqual([
      'https://cdn.duncit.com/a.png',
      'https://cdn.duncit.com/b.png',
    ]);
    expect(result.html).toContain('src="https://server.duncit.com/t/i/camp-1/0"');
    expect(result.html).toContain('src="https://server.duncit.com/t/i/camp-1/1"');
  });

  it('gives a repeated image a single index', () => {
    const result = run('<img src="https://cdn.duncit.com/a.png"><img src="https://cdn.duncit.com/a.png">');
    expect(result.images).toHaveLength(1);
  });

  it('leaves an inline data image alone', () => {
    const result = run('<img src="data:image/gif;base64,AAA" />');
    expect(result.images).toEqual([]);
    expect(result.html).toContain('src="data:image/gif;base64,AAA"');
  });

  it('handles the multi-line img tags MJML actually emits', () => {
    const result = instrumentCampaignHtml(
      wrap('<img\n   alt="" src="https://cdn.duncit.com/a.png" style="border:0;"\n />'),
      'camp-1',
      'https://server.duncit.com',
    );
    expect(result.images).toEqual([{ url: 'https://cdn.duncit.com/a.png' }]);
  });
});

describe('instrumentCampaignHtml pixel', () => {
  it('appends the open pixel inside the body', () => {
    const result = run('<p>Hi</p>');
    expect(result.html).toContain('<img src="https://server.duncit.com/t/o/camp-1"');
    expect(result.html.indexOf('/t/o/camp-1')).toBeLessThan(result.html.indexOf('</body>'));
  });

  // A hidden image is the first thing a mail client refuses to fetch, which is
  // exactly how a campaign ends up reporting clicks and no opens.
  it('does not hide the pixel with display:none', () => {
    expect(run('<p>Hi</p>').html).not.toContain('display:none');
  });

  it('tolerates a server url with trailing slashes', () => {
    const result = instrumentCampaignHtml(
      wrap('<a href="https://duncit.com/x">X</a>'),
      'camp-1',
      'https://server.duncit.com//',
    );
    expect(result.html).toContain('href="https://server.duncit.com/t/c/camp-1/0"');
  });

  it('serves a real 1x1 GIF as the pixel', () => {
    expect(TRACKING_PIXEL.subarray(0, 3).toString()).toBe('GIF');
    expect(TRACKING_PIXEL.length).toBeLessThan(100);
  });
});
