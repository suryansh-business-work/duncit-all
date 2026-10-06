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

  it('shows the empty state for an empty address string', () => {
    const { container } = render(<MapEmbed address="" />);
    expect(screen.getByText(/add an address to preview the map/i)).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('trims the address and builds a search deeplink when no map_link is set', () => {
    render(<MapEmbed address="  Indiranagar  " mapLink={null} />);
    expect(screen.getByTitle('Map of Indiranagar')).toHaveAttribute(
      'src',
      'https://www.google.com/maps?q=Indiranagar&output=embed',
    );
    const link = screen.getByRole('link', { name: /open in google maps/i }) as HTMLAnchorElement;
    expect(link.href).toBe('https://www.google.com/maps?q=Indiranagar');
  });
});
