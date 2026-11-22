import { checkedLink, isStoreLink, isWebLink } from '../../store.shared';

/**
 * Links the public pet store renders — the announcement bar, home tiles, a
 * product video — held on the server to the ecomm console's own rules, so a
 * `javascript:` value saved by API or an AI tool never reaches a shopper.
 */

describe('isStoreLink — header, footer and home-tile links', () => {
  it.each(['/c/dry-food', '/', 'https://duncit.com/pets'])('accepts %s', (link) => {
    expect(isStoreLink(link)).toBe(true);
  });

  it.each(['//evil.example', 'http://duncit.com', 'javascript:alert(1)', 'data:text/html,hi', 'dry-food'])('refuses %s', (link) => {
    expect(isStoreLink(link)).toBe(false);
  });
});

describe('isWebLink — the console’s general link rule', () => {
  it.each(['/p/leash', 'http://cdn.example.com/v.mp4', 'HTTPS://youtu.be/abc'])('accepts %s', (link) => {
    expect(isWebLink(link)).toBe(true);
  });

  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', 'data:video/mp4;base64,AAAA', 'vbscript:x', 'https://', 'ftp://files.example.com'])(
    'refuses %s',
    (link) => {
      expect(isWebLink(link)).toBe(false);
    }
  );
});

describe('checkedLink', () => {
  it('returns a link that fits, and allows none', () => {
    expect(checkedLink('The video link', 'https://youtu.be/abc')).toBe('https://youtu.be/abc');
    expect(checkedLink('The video link', '')).toBe('');
  });

  it('refuses one that does not, naming the field, as invalid input', () => {
    let caught: unknown;
    try {
      checkedLink('The announcement link', 'javascript:alert(1)');
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({
      message: 'The announcement link must be a store path or a web address (https://…)',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('holds a home tile to the stricter store rule', () => {
    expect(() => checkedLink('A tile link', 'http://duncit.com', isStoreLink)).toThrow('A tile link must be');
    expect(checkedLink('A tile link', '/c/toys', isStoreLink)).toBe('/c/toys');
  });
});
