import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ExploreReelVideo from '../ExploreReelVideo';

describe('ExploreReelVideo', () => {
  it('renders a video element with the given src and autoplay attributes', () => {
    const { container } = render(<ExploreReelVideo src="https://cdn.example.com/reel.mp4" />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://cdn.example.com/reel.mp4');
    expect(video).toHaveAttribute('autoplay');
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
  });

  it('applies full-bleed cover styling', () => {
    const { container } = render(<ExploreReelVideo src="x.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).toHaveStyle({ objectFit: 'cover', width: '100%', height: '100%' });
  });
});
