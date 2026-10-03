import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ClubHero from '../ClubHero';

const h = vi.hoisted(() => ({ reduceMotion: false }));

/*
  react-slick clones slides for its infinite loop and measures the track, none
  of which jsdom can do. The stand-in renders the slides once, the arrows it was
  handed when arrows are on, and exposes whether autoplay is running — which is
  the decision ClubHero makes and the thing these tests check.
*/
vi.mock('react-slick', () => ({
  default: ({ children, arrows, autoplay, prevArrow, nextArrow }: any) => (
    <div data-testid="slider" data-autoplay={String(autoplay)}>
      {arrows ? prevArrow : null}
      {children}
      {arrows ? nextArrow : null}
    </div>
  ),
}));
vi.mock('../../../components/media/VideoMedia', () => ({
  default: ({ src, testId }: any) => <div data-testid={testId} data-src={src} />,
}));
vi.mock('../../../components/moments/MomentLightbox', () => ({
  default: ({ index, onClose }: any) =>
    index === null ? null : (
      <div data-testid="lightbox" data-index={index}>
        <button type="button" onClick={onClose}>
          close-lightbox
        </button>
      </div>
    ),
}));

const IMG_A = { url: 'https://img.example/a.jpg', type: 'IMAGE' };
const IMG_B = { url: 'https://img.example/b.jpg', type: 'IMAGE' };
const VIDEO = { url: 'https://img.example/c.mp4', type: 'VIDEO' };

function renderHero(media: { url: string; type: string }[], over: Record<string, unknown> = {}) {
  const handlers = {
    onBack: vi.fn(),
    onToggleFollow: vi.fn(),
    onToggleSave: vi.fn(),
    onShare: vi.fn(),
  };
  render(
    <ClubHero media={media} title="Badminton Buddies" saved={false} following={false} {...handlers} {...over} />,
  );
  return handlers;
}

const realMatchMedia = globalThis.matchMedia;

beforeEach(() => {
  h.reduceMotion = false;
  // The member's motion preference, as the browser reports it.
  globalThis.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') && h.reduceMotion,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof globalThis.matchMedia;
});

afterEach(() => {
  globalThis.matchMedia = realMatchMedia;
});

describe('ClubHero', () => {
  it('shows a placeholder with the actions when the club has no media', () => {
    const { onBack, onToggleFollow, onToggleSave, onShare } = renderHero([]);

    expect(screen.getByTestId('club-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('slider')).not.toBeInTheDocument();
    expect(screen.getByTestId('GroupsRoundedIcon')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('detail-back'));
    fireEvent.click(screen.getByTestId('club-follow'));
    fireEvent.click(screen.getByTestId('club-hero-save'));
    fireEvent.click(screen.getByTestId('hb-share'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onToggleFollow).toHaveBeenCalledTimes(1);
    expect(onToggleSave).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('reflects the following and saved state in the overlay actions', () => {
    renderHero([], { following: true, saved: true });
    expect(screen.getByTestId('club-follow')).toHaveTextContent('Following');
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
  });

  it('shows a single image without arrows, autoplay or a slideshow toggle', () => {
    renderHero([IMG_A]);

    const image = screen.getByRole('img', { name: 'Badminton Buddies' });
    expect(image).toHaveAttribute('src', IMG_A.url);
    expect(screen.queryByTestId('club-hero-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('club-hero-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slideshow-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('slider')).toHaveAttribute('data-autoplay', 'false');
  });

  it('renders a video slide through the video player, not as a zoomable image', () => {
    renderHero([IMG_A, VIDEO]);
    expect(screen.getByTestId('detail-hero-video-1')).toHaveAttribute('data-src', VIDEO.url);
    expect(screen.queryByTestId('detail-hero-image-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('detail-hero-image-0')).toBeInTheDocument();
  });

  it('opens the lightbox on the tapped image and closes it again', () => {
    renderHero([IMG_A, IMG_B]);
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('detail-hero-image-1'));
    expect(screen.getByTestId('lightbox')).toHaveAttribute('data-index', '1');

    fireEvent.click(screen.getByRole('button', { name: 'close-lightbox' }));
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('autoplays several slides with arrows and lets the member pause and resume', () => {
    renderHero([IMG_A, IMG_B]);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.getByTestId('slider')).toHaveAttribute('data-autoplay', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Pause slideshow' }));
    expect(screen.getByTestId('slider')).toHaveAttribute('data-autoplay', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Play slideshow' }));
    expect(screen.getByTestId('slider')).toHaveAttribute('data-autoplay', 'true');
  });

  it('starts paused under reduced motion until the member presses play', () => {
    h.reduceMotion = true;
    renderHero([IMG_A, IMG_B]);

    expect(screen.getByTestId('slider')).toHaveAttribute('data-autoplay', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Play slideshow' }));
    expect(screen.getByTestId('slider')).toHaveAttribute('data-autoplay', 'true');
  });
});
