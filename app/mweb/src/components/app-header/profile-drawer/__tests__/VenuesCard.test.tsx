import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VenuesCard from '../VenuesCard';

const mockBranding = vi.fn();
vi.mock('../../../../hooks/useBrandingAssets', () => ({
  useBrandingAssets: () => mockBranding(),
}));

describe('VenuesCard', () => {
  beforeEach(() => {
    mockBranding.mockReset();
  });

  it('renders the venues title and caption', () => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    render(<VenuesCard onNavigate={vi.fn()} />);
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Discover spaces to meet near you')).toBeInTheDocument();
  });

  it('does not render the video when no url is provided', () => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    const { container } = render(<VenuesCard onNavigate={vi.fn()} />);
    expect(container.querySelector('video')).toBeNull();
  });

  it('renders an autoplaying muted looping video when a url is provided', () => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: 'https://cdn.example.com/venues.mp4' });
    const { container } = render(<VenuesCard onNavigate={vi.fn()} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', 'https://cdn.example.com/venues.mp4');
    expect(video).toHaveAttribute('loop');
    expect(video.muted).toBe(true);
  });

  it('navigates to /venues on click', () => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    const onNavigate = vi.fn();
    render(<VenuesCard onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore venues' }));
    expect(onNavigate).toHaveBeenCalledWith('/venues');
  });

  it('navigates to /venues on Enter and Space keydown', () => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    const onNavigate = vi.fn();
    render(<VenuesCard onNavigate={onNavigate} />);
    const card = screen.getByRole('button', { name: 'Explore venues' });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onNavigate).toHaveBeenCalledTimes(2);
    expect(onNavigate).toHaveBeenCalledWith('/venues');
  });

  it('ignores other keys', () => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    const onNavigate = vi.fn();
    render(<VenuesCard onNavigate={onNavigate} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Explore venues' }), { key: 'Tab' });
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
