import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdSlide from '../../AdSlide';
import type { PublicAd } from '../../useActiveAds';

const ad = (overrides: Partial<PublicAd> = {}): PublicAd => ({
  id: 'ad-1',
  ad_type: 'IMAGE',
  media_url: 'https://cdn.example/ad-1.jpg',
  redirect_url: null,
  ad_title: 'Fresh brews nearby',
  position: 'EXPLORE_SCROLL',
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdSlide', () => {
  it('renders the sponsored slide with title and image media', () => {
    render(<AdSlide ad={ad()} />);
    expect(screen.getByTestId('ad-slide')).toBeInTheDocument();
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    expect(screen.getByText('Fresh brews nearby')).toBeInTheDocument();
    expect(screen.getByAltText('Fresh brews nearby')).toBeInTheDocument();
    // No CTA without a redirect_url.
    expect(screen.queryByRole('button', { name: 'Learn more' })).not.toBeInTheDocument();
  });

  it('renders a video creative for VIDEO ads', () => {
    const { container } = render(<AdSlide ad={ad({ ad_type: 'VIDEO' })} />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://cdn.example/ad-1.jpg');
  });

  it('omits the title when the ad has none', () => {
    render(<AdSlide ad={ad({ ad_title: null })} />);
    expect(screen.queryByText('Fresh brews nearby')).not.toBeInTheDocument();
    // Image alt falls back to "Sponsored".
    expect(screen.getByAltText('Sponsored')).toBeInTheDocument();
  });

  it('shows a Learn more CTA that opens the redirect in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<AdSlide ad={ad({ redirect_url: 'https://brand.example' })} />);
    const cta = screen.getByRole('button', { name: 'Learn more' });
    fireEvent.click(cta);
    expect(open).toHaveBeenCalledWith('https://brand.example', '_blank', 'noreferrer');
  });
});
