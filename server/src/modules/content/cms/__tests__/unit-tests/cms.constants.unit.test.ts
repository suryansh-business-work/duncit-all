import { CMS_ERROR_CODES, CMS_ERROR_PATHS, CMS_META_NAME, errorCodeOf } from '../../cms.constants';

describe('CMS error pages', () => {
  it('serves 404, 500 and 503 at their own paths', () => {
    expect(CMS_ERROR_CODES).toEqual([404, 500, 503]);
    expect(CMS_ERROR_PATHS).toEqual(['/404', '/500', '/503']);
  });

  it.each([
    ['/404', 404],
    ['/500', 500],
    ['/503', 503],
  ])('reads %s as the %i error page', (path, code) => {
    expect(errorCodeOf(path)).toBe(code);
  });

  it.each(['/', '/about', '/403', '/404/extra', '404', '/5000'])('reads %s as an ordinary page', (path) => {
    expect(errorCodeOf(path)).toBeNull();
  });
});

describe('CMS_META_NAME', () => {
  it.each(['description', 'author', 'og:locale', 'article:author', 'twitter:site', 'msapplication-TileColor', 'a.b_c', 'x'])(
    'accepts %s',
    (name) => {
      expect(CMS_META_NAME.test(name)).toBe(true);
    }
  );

  it.each(['', '1author', ':locale', '-x', 'has space', 'quote"', 'tag<', `a${'b'.repeat(80)}`])('refuses %p', (name) => {
    expect(CMS_META_NAME.test(name)).toBe(false);
  });

  it('allows exactly 80 characters', () => {
    expect(CMS_META_NAME.test(`a${'b'.repeat(79)}`)).toBe(true);
  });
});
