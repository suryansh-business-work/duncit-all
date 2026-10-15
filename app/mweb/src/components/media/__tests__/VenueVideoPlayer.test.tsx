import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { venueVideoOf, type VenueVideo } from '@duncit/forms/schemas';
import { videoSourceUrl } from '@duncit/utils';
import VenueVideoPlayer from '../VenueVideoPlayer';

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const CLIP = 'https://cdn.test/venues/v1/clip.mp4';

const videoOf = (url: string): VenueVideo => {
  const video = venueVideoOf(url);
  if (!video) throw new Error(`not a video: ${url}`);
  return video;
};

describe('VenueVideoPlayer', () => {
  it('plays a YouTube link in the privacy-enhanced embed, titled for a screen reader, with a link out', () => {
    render(<VenueVideoPlayer video={videoOf(YOUTUBE)} title="Video 1 of Grand Hall" testId="player" />);
    const frame = screen.getByTitle('Video 1 of Grand Hall');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(frame).toHaveAttribute('loading', 'lazy');
    // No autoplay: nothing plays until the guest presses play.
    expect(frame.getAttribute('allow')).not.toMatch(/autoplay/);

    const out = screen.getByRole('link', { name: 'Watch on YouTube' });
    expect(out).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(out).toHaveAttribute('target', '_blank');
    expect(out).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('player')).toContainElement(frame);
    expect(document.querySelector('video')).toBeNull();
  });

  it('plays an uploaded clip in a native player on the stored file, without autoplay', () => {
    render(<VenueVideoPlayer video={videoOf(CLIP)} title="Video 2 of Grand Hall" testId="player" />);
    const player = screen.getByTestId('player');
    expect(player.tagName).toBe('VIDEO');
    expect(player).toHaveAttribute('src', videoSourceUrl(CLIP));
    expect(player).toHaveAttribute('controls');
    expect(player).toHaveAttribute('preload', 'metadata');
    expect(player).not.toHaveAttribute('autoplay');
    expect(player).toHaveAccessibleName('Video 2 of Grand Hall');
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Watch on YouTube' })).not.toBeInTheDocument();
  });
});
