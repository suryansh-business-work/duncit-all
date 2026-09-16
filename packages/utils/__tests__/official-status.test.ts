import { describe, expect, it } from 'vitest';
import {
  buildOfficialStatusSlides,
  hasUnseenOfficialStatus,
  isOfficialStatusLive,
  type OfficialStatusSource,
} from '../src/official-status';

const NOW = new Date('2026-09-16T12:00:00.000Z').getTime();

function status(overrides: Partial<OfficialStatusSource> = {}): OfficialStatusSource {
  return {
    id: 'official-1',
    media_url: 'https://ik.imagekit.io/duncit/monsoon-run.jpg',
    media_type: 'IMAGE',
    caption: 'Monsoon runs are back in Pune',
    link_url: '/pod-ideas',
    expires_at: '2026-09-17T12:00:00.000Z',
    is_active: true,
    seen_by_me: false,
    ...overrides,
  };
}

describe('isOfficialStatusLive', () => {
  it('keeps an active status until its expiry', () => {
    expect(isOfficialStatusLive(status(), NOW)).toBe(true);
    expect(isOfficialStatusLive(status({ expires_at: '2026-09-16T11:59:59.000Z' }), NOW)).toBe(false);
  });

  it('treats a null expiry as a status that never expires', () => {
    expect(isOfficialStatusLive(status({ expires_at: null }), NOW)).toBe(true);
    expect(isOfficialStatusLive(status({ expires_at: undefined }), NOW)).toBe(true);
  });

  it('drops a status the marketer switched off, however far off its expiry is', () => {
    expect(isOfficialStatusLive(status({ is_active: false, expires_at: null }), NOW)).toBe(false);
  });

  it('keeps a status whose is_active the query did not ask for', () => {
    expect(isOfficialStatusLive(status({ is_active: undefined }), NOW)).toBe(true);
    expect(isOfficialStatusLive(status({ is_active: null }), NOW)).toBe(true);
  });

  it('defaults now to the real clock', () => {
    expect(isOfficialStatusLive(status({ expires_at: '1999-01-01T00:00:00.000Z' }))).toBe(false);
    expect(isOfficialStatusLive(status({ expires_at: '2999-01-01T00:00:00.000Z' }))).toBe(true);
  });
});

describe('buildOfficialStatusSlides', () => {
  it('builds a slide per live status, in the order the server answered', () => {
    const slides = buildOfficialStatusSlides(
      [
        status({ id: 'official-1' }),
        status({ id: 'official-2', expires_at: '2026-09-16T10:00:00.000Z' }),
        status({ id: 'official-3', expires_at: null }),
      ],
      NOW,
    );
    expect(slides.map((slide) => slide.id)).toEqual(['official-1', 'official-3']);
    expect(slides[0]).toEqual({
      id: 'official-1',
      mediaUrl: 'https://ik.imagekit.io/duncit/monsoon-run.jpg',
      mediaType: 'IMAGE',
      caption: 'Monsoon runs are back in Pune',
      linkUrl: '/pod-ideas',
      linkInternal: true,
      seen: false,
      expiresAt: '2026-09-17T12:00:00.000Z',
    });
    expect(slides[1].expiresAt).toBeNull();
  });

  it('reads a video status as a video slide', () => {
    const [slide] = buildOfficialStatusSlides([status({ media_type: 'VIDEO' })], NOW);
    expect(slide.mediaType).toBe('VIDEO');
  });

  it('falls back to an image when the type is missing', () => {
    const [missing] = buildOfficialStatusSlides([status({ media_type: null })], NOW);
    expect(missing.mediaType).toBe('IMAGE');
    const [absent] = buildOfficialStatusSlides([status({ media_type: undefined })], NOW);
    expect(absent.mediaType).toBe('IMAGE');
  });

  it('treats an https link as one that leaves the app', () => {
    const [slide] = buildOfficialStatusSlides(
      [status({ link_url: 'https://duncit.com/blog/monsoon' })],
      NOW,
    );
    expect(slide.linkUrl).toBe('https://duncit.com/blog/monsoon');
    expect(slide.linkInternal).toBe(false);
  });

  it('leaves a status with no link untappable', () => {
    const [empty] = buildOfficialStatusSlides([status({ link_url: '' })], NOW);
    expect(empty.linkUrl).toBe('');
    expect(empty.linkInternal).toBe(false);
    const [missing] = buildOfficialStatusSlides([status({ link_url: null })], NOW);
    expect(missing.linkUrl).toBe('');
    const [absent] = buildOfficialStatusSlides([status({ link_url: undefined })], NOW);
    expect(absent.linkUrl).toBe('');
  });

  it('reads a missing caption as no caption', () => {
    const [nulled] = buildOfficialStatusSlides([status({ caption: null })], NOW);
    expect(nulled.caption).toBe('');
    const [absent] = buildOfficialStatusSlides([status({ caption: undefined })], NOW);
    expect(absent.caption).toBe('');
  });

  it('marks a slide seen only when the viewer has watched it', () => {
    const [seen] = buildOfficialStatusSlides([status({ seen_by_me: true })], NOW);
    expect(seen.seen).toBe(true);
    const [unseen] = buildOfficialStatusSlides([status({ seen_by_me: false })], NOW);
    expect(unseen.seen).toBe(false);
    // Signed out: the field is absent, which is "not watched".
    const [absent] = buildOfficialStatusSlides([status({ seen_by_me: undefined })], NOW);
    expect(absent.seen).toBe(false);
    const [nulled] = buildOfficialStatusSlides([status({ seen_by_me: null })], NOW);
    expect(nulled.seen).toBe(false);
  });

  it('answers nothing before the query lands', () => {
    expect(buildOfficialStatusSlides(undefined, NOW)).toEqual([]);
    expect(buildOfficialStatusSlides(null, NOW)).toEqual([]);
    expect(buildOfficialStatusSlides([], NOW)).toEqual([]);
  });

  it('defaults now to the real clock', () => {
    expect(
      buildOfficialStatusSlides([status({ expires_at: '1999-01-01T00:00:00.000Z' })]),
    ).toEqual([]);
    expect(
      buildOfficialStatusSlides([status({ expires_at: '2999-01-01T00:00:00.000Z' })]),
    ).toHaveLength(1);
  });
});

describe('hasUnseenOfficialStatus', () => {
  it('lights the ring while one slide is unwatched', () => {
    const slides = buildOfficialStatusSlides(
      [status({ id: 'official-1', seen_by_me: true }), status({ id: 'official-2', seen_by_me: false })],
      NOW,
    );
    expect(hasUnseenOfficialStatus(slides)).toBe(true);
  });

  it('greys the ring once every slide is watched', () => {
    const slides = buildOfficialStatusSlides([status({ seen_by_me: true })], NOW);
    expect(hasUnseenOfficialStatus(slides)).toBe(false);
  });

  it('greys the ring when there is nothing to watch', () => {
    expect(hasUnseenOfficialStatus([])).toBe(false);
  });
});
