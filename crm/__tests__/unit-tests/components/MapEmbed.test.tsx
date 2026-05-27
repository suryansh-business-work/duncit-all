import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapEmbed from '@/components/MapEmbed';

describe('MapEmbed', () => {
  it('renders an iframe whose src embeds the address as a query', () => {
    const { container } = render(<MapEmbed address="12 MG Road, Bengaluru" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    const src = iframe?.getAttribute('src') ?? '';
    expect(src).toContain('google.com/maps');
    expect(src).toContain(encodeURIComponent('12 MG Road, Bengaluru'));
    expect(src).toContain('output=embed');
  });

  it('falls back to a friendly empty state when the address is blank', () => {
    render(<MapEmbed address="   " />);
    expect(screen.getByText(/add an address/i)).toBeInTheDocument();
  });

  it('uses the explicit map_link for the open-in-maps deeplink when present', () => {
    render(<MapEmbed address="12 MG Road" mapLink="https://goo.gl/maps/abc" />);
    const link = screen.getByRole('link', { name: /open in google maps/i }) as HTMLAnchorElement;
    expect(link.href).toBe('https://goo.gl/maps/abc');
  });
});
