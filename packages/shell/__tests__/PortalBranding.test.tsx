import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));

import { useQuery } from '@apollo/client';
import { PortalBranding } from '../src/PortalBranding';

const SPLASH_KEY = 'duncit_portal_splash_shown';
const mockQuery = vi.mocked(useQuery);

function setBranding(branding: Record<string, unknown> | undefined) {
  mockQuery.mockReturnValue({ data: branding ? { branding } : undefined } as never);
}

describe('PortalBranding', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.head.innerHTML = '';
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no splash asset is configured', () => {
    setBranding(undefined);
    const { container } = render(<PortalBranding />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing once the splash was already shown this session', () => {
    sessionStorage.setItem(SPLASH_KEY, '1');
    setBranding({ portals_splash_url: '/s.png', app_name: 'Acme' });
    const { container } = render(<PortalBranding />);
    expect(container).toBeEmptyDOMElement();
  });

  it('applies favicon + font and shows an image splash that auto-dismisses', () => {
    vi.useFakeTimers();
    const existing = document.createElement('link');
    existing.rel = 'icon';
    existing.setAttribute('type', 'image/x-icon');
    document.head.appendChild(existing);

    setBranding({
      portals_favicon_url: '/fav.png',
      portals_font_family: 'Poppins',
      portals_splash_url: '/s.png',
      portals_splash_type: 'IMAGE',
      app_name: 'Acme',
    });
    const view = render(<PortalBranding />);

    expect(existing.getAttribute('href')).toBe('/fav.png');
    expect(existing.hasAttribute('type')).toBe(false);
    expect(document.querySelectorAll('link[rel="shortcut icon"]').length).toBe(1);
    expect(document.querySelector('link[href*="fonts.googleapis.com"]')).toBeTruthy();

    const img = screen.getByAltText('Acme') as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toContain('/s.png');

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(sessionStorage.getItem(SPLASH_KEY)).toBe('1');
    expect(screen.queryByAltText('Acme')).not.toBeInTheDocument();

    view.unmount();
    expect(document.querySelector('link[href*="fonts.googleapis.com"]')).toBeNull();
  });

  it('defaults the image splash alt text to Duncit without an app name', () => {
    setBranding({ portals_splash_url: '/s.png', portals_splash_type: 'IMAGE' });
    render(<PortalBranding />);
    expect(screen.getByAltText('Duncit')).toBeInTheDocument();
  });

  it('shows a video splash and defaults the label to Duncit', () => {
    vi.useFakeTimers();
    setBranding({ portals_splash_url: '/s.mp4', portals_splash_type: 'VIDEO' });
    const { container } = render(<PortalBranding />);
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByLabelText('Loading Duncit')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(sessionStorage.getItem(SPLASH_KEY)).toBe('1');
  });
});
