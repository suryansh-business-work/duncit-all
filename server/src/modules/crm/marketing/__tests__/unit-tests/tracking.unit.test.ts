import { TRACKING_PIXEL, instrumentCampaignHtml } from '../../tracking.service';

const wrap = (body: string) => `<html><body>${body}</body></html>`;

describe('instrumentCampaignHtml', () => {
  it('routes every link through the tracker and records what it points at', () => {
    const result = instrumentCampaignHtml(
      wrap('<a href="https://duncit.com/pods">Pods</a><a href="http://duncit.com/clubs">Clubs</a>'),
      'camp-1',
      'https://server.duncit.com',
    );
    expect(result.links).toEqual(['https://duncit.com/pods', 'http://duncit.com/clubs']);
    expect(result.html).toContain('href="https://server.duncit.com/t/c/camp-1/0"');
    expect(result.html).toContain('href="https://server.duncit.com/t/c/camp-1/1"');
    expect(result.html).not.toContain('href="https://duncit.com/pods"');
  });

  // Two buttons pointing at the same page are one destination, not two.
  it('gives a repeated destination a single index', () => {
    const result = instrumentCampaignHtml(
      wrap('<a href="https://duncit.com/x">One</a><a href="https://duncit.com/x">Two</a>'),
      'camp-1',
      'https://server.duncit.com',
    );
    expect(result.links).toEqual(['https://duncit.com/x']);
    expect(result.html.match(/t\/c\/camp-1\/0/g)).toHaveLength(2);
  });

  it('appends the open pixel inside the body', () => {
    const result = instrumentCampaignHtml(wrap('<p>Hi</p>'), 'camp-1', 'https://server.duncit.com');
    expect(result.html).toContain('<img src="https://server.duncit.com/t/o/camp-1"');
    expect(result.html.indexOf('/t/o/camp-1')).toBeLessThan(result.html.indexOf('</body>'));
  });

  it('does not rewrite a mailto or an in-page anchor', () => {
    const result = instrumentCampaignHtml(
      wrap('<a href="mailto:hi@duncit.com">Mail</a><a href="#top">Top</a>'),
      'camp-1',
      'https://server.duncit.com',
    );
    expect(result.links).toEqual([]);
    expect(result.html).toContain('href="mailto:hi@duncit.com"');
    expect(result.html).toContain('href="#top"');
  });

  it('tolerates a server url with a trailing slash', () => {
    const result = instrumentCampaignHtml(
      wrap('<a href="https://duncit.com/x">X</a>'),
      'camp-1',
      'https://server.duncit.com/',
    );
    expect(result.html).toContain('href="https://server.duncit.com/t/c/camp-1/0"');
  });

  it('serves a real 1x1 GIF as the pixel', () => {
    expect(TRACKING_PIXEL.subarray(0, 3).toString()).toBe('GIF');
    expect(TRACKING_PIXEL.length).toBeLessThan(100);
  });
});
