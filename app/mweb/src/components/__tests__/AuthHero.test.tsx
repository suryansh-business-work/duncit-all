import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthBackground from '../AuthBackground';
import AuthHero from '../AuthHero';
import AuthHeading from '../AuthHeading';

const branding = vi.hoisted(() => ({ video: '', image: '' }));
vi.mock('../../hooks/useBrandingAssets', () => ({
  useBrandingAssets: () => ({ loginBackgroundVideoUrl: branding.video, loginBackgroundImageUrl: branding.image }),
}));

/** jsdom matches no media query; this one matches "reduced motion" when asked to. */
function preferReducedMotion(reduce: boolean) {
  vi.spyOn(globalThis, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

const wrap = (ui: ReactNode) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      {ui}
    </MockedProvider>,
  );

beforeEach(() => {
  branding.video = '';
  branding.image = '';
  preferReducedMotion(false);
});
afterEach(() => vi.restoreAllMocks());

describe('AuthHero', () => {
  it('renders just the heading on the flat ground when no login background is switched on', () => {
    wrap(
      <AuthHero room={140} gap={24}>
        <h1>Welcome back</h1>
      </AuthHero>,
    );
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByTestId('auth-hero')).not.toBeInTheDocument();
  });

  it('draws the admin image behind the heading, hidden from screen readers, with the heading on the scrim', () => {
    branding.image = 'https://cdn.test/login.jpg';
    wrap(
      <AuthHero room={140} gap={24}>
        <h1>Welcome back</h1>
      </AuthHero>,
    );
    const hero = screen.getByTestId('auth-hero');
    const image = screen.getByTestId('auth-backdrop-image');
    expect(image).toHaveAttribute('src', 'https://cdn.test/login.jpg');
    expect(image).toHaveAttribute('alt', '');
    expect(image.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('auth-hero-fade')).toHaveAttribute('aria-hidden', 'true');
    // The heading is IN the hero band — it can never slide off the photo.
    expect(within(hero).getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByTestId('auth-backdrop-video')).not.toBeInTheDocument();
  });

  it('prefers the video over the image, muted, looping and inline so a phone can autoplay it', () => {
    branding.video = 'https://cdn.test/login.mp4';
    branding.image = 'https://cdn.test/login.jpg';
    wrap(
      <AuthHero room={140} gap={24}>
        <h1>Welcome back</h1>
      </AuthHero>,
    );
    const video = screen.getByTestId('auth-backdrop-video') as HTMLVideoElement;
    expect(video).toHaveAttribute('src', 'https://cdn.test/login.mp4');
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('autoplay');
    expect(screen.queryByTestId('auth-backdrop-image')).not.toBeInTheDocument();
  });

  it('holds the video still for a visitor who asked for reduced motion (WCAG 2.2.2)', async () => {
    preferReducedMotion(true);
    branding.video = 'https://cdn.test/login.mp4';
    wrap(
      <AuthHero room={140} gap={24}>
        <h1>Welcome back</h1>
      </AuthHero>,
    );
    await waitFor(() => expect(screen.getByTestId('auth-backdrop-video')).not.toHaveAttribute('autoplay'));
  });
});

describe('AuthHeading', () => {
  it('opens with the square logo tile, then the two-beat headline and the subtitle', async () => {
    wrap(<AuthHeading title="Welcome" accent="back!" subtitle="Sign in to find your people." />);
    const heading = screen.getByTestId('auth-heading');
    expect(heading).toHaveTextContent('Welcome');
    expect(heading).toHaveTextContent('back!');
    expect(screen.getByTestId('auth-heading-subtitle')).toHaveTextContent('Sign in to find your people.');
    // The branding read goes unanswered here, so the bundled logo lands in the tile.
    expect(await screen.findByTestId('auth-logo-tile')).toBeInTheDocument();
  });

  it('leaves the subtitle out when there is none', () => {
    wrap(<AuthHeading title="Welcome" accent="back!" />);
    expect(screen.queryByTestId('auth-heading-subtitle')).not.toBeInTheDocument();
  });

  it('sits on the login hero when one is switched on, and on the flat ground otherwise', () => {
    const { unmount } = wrap(<AuthHeading title="Welcome" accent="back!" />);
    expect(screen.queryByTestId('auth-hero')).not.toBeInTheDocument();
    unmount();

    branding.image = 'https://cdn.test/login.jpg';
    wrap(<AuthHeading title="Welcome" accent="back!" />);
    expect(within(screen.getByTestId('auth-hero')).getByTestId('auth-heading')).toBeInTheDocument();
  });
});

describe('AuthBackground', () => {
  it('leaves the hero to the heading — one hero, in flow, never a second one pinned behind the page', () => {
    branding.image = 'https://cdn.test/login.jpg';
    wrap(
      <AuthBackground>
        <AuthHeading title="Welcome" accent="back!" />
      </AuthBackground>,
    );
    expect(screen.getAllByTestId('auth-hero')).toHaveLength(1);
    expect(screen.getAllByTestId('auth-backdrop-image')).toHaveLength(1);
    expect(within(screen.getByTestId('auth-hero')).getByTestId('auth-heading')).toBeInTheDocument();
    // The light/dark switch still closes the screen.
    expect(screen.getByTestId('auth-mode-toggle')).toBeInTheDocument();
  });
});
