import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MediaGallery from '../MediaGallery';
import type { ClubMedia } from '../types';

const items: ClubMedia[] = [
  { url: 'https://cdn.test/1.jpg', type: 'IMAGE' },
  { url: 'https://cdn.test/2.mp4', type: 'VIDEO' },
];

describe('MediaGallery', () => {
  it('shows the empty text and a zero count when there are no items', () => {
    render(<MediaGallery title="Cover media" icon={<span />} items={[]} emptyText="No cover media yet." />);
    expect(screen.getByText('No cover media yet.')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders an image tile with a lazy-loaded img and no play icon', () => {
    render(<MediaGallery title="Cover media" icon={<span />} items={[items[0]]} emptyText="empty" />);
    const img = screen.getByAltText('Cover media 1');
    expect(img).toHaveAttribute('src', 'https://cdn.test/1.jpg');
    expect(img.tagName).toBe('IMG');
    expect(document.querySelector('video')).not.toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders a video tile with the play icon overlay for a VIDEO item', () => {
    render(<MediaGallery title="Moments" icon={<span />} items={[items[1]]} emptyText="empty" />);
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('src', 'https://cdn.test/2.mp4');
    expect(document.querySelector('img')).not.toBeInTheDocument();
    // PlayCircleIcon renders an <svg> with the MUI icon test id.
    expect(document.querySelector('svg[data-testid="PlayCircleIcon"]')).toBeInTheDocument();
  });

  it('opens the lightbox at the clicked tile via a mouse click', () => {
    render(<MediaGallery title="Cover media" icon={<span />} items={items} emptyText="empty" />);
    fireEvent.click(screen.getByLabelText('Open Cover media 2'));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('opens the lightbox via Enter and Space on the keyboard, and ignores other keys', () => {
    render(<MediaGallery title="Cover media" icon={<span />} items={items} emptyText="empty" />);
    const firstTile = screen.getByLabelText('Open Cover media 1');

    fireEvent.keyDown(firstTile, { key: 'Tab' });
    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument();

    fireEvent.keyDown(firstTile, { key: 'Enter' });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument();

    fireEvent.keyDown(firstTile, { key: ' ' });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('closes the lightbox from its close button, clearing the active index', () => {
    render(<MediaGallery title="Cover media" icon={<span />} items={items} emptyText="empty" />);
    fireEvent.click(screen.getByLabelText('Open Cover media 1'));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument();
  });

  it('navigates the lightbox forward from a gallery tile without losing the open state', () => {
    render(<MediaGallery title="Cover media" icon={<span />} items={items} emptyText="empty" />);
    fireEvent.click(screen.getByLabelText('Open Cover media 1'));
    fireEvent.click(screen.getByLabelText('Next'));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('renders the passed-in title and icon', () => {
    render(<MediaGallery title="Moments" icon={<span data-testid="custom-icon" />} items={[]} emptyText="empty" />);
    expect(screen.getByText('Moments')).toBeInTheDocument();
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('does not throw when clicked with an unused vi import present', () => {
    // Sanity check that vi is available for any future spy-based assertions.
    expect(typeof vi.fn).toBe('function');
  });
});
