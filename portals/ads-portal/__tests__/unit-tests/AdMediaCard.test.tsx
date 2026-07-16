import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import AdMediaCard from '../../src/pages/ads/ad-details/AdMediaCard';
import { adDetail } from './fixtures';
import { renderWithProviders } from './testkit';

describe('AdMediaCard', () => {
  it('renders an image creative for an IMAGE ad', () => {
    const { container } = renderWithProviders(<AdMediaCard ad={adDetail({ ad_type: 'IMAGE' })} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/ads/banner.png');
    expect(img).toHaveAttribute('alt', 'Weekend Mega Sale creative');
    expect(screen.getByText('Image')).toBeInTheDocument();
  });

  it('renders a video creative for a VIDEO ad', () => {
    const { container } = renderWithProviders(
      <AdMediaCard ad={adDetail({ ad_type: 'VIDEO', media_url: 'https://cdn/clip.mp4' })} />,
    );
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', 'https://cdn/clip.mp4');
    expect(screen.getByText('Video')).toBeInTheDocument();
  });
});
