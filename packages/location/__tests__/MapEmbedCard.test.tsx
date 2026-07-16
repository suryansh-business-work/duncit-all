import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapEmbedCard } from '../src/MapEmbedCard';

describe('MapEmbedCard', () => {
  it('renders nothing when there is no query, parts, coords, or lat/lng', () => {
    const { container } = render(<MapEmbedCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when parts are all blank', () => {
    const { container } = render(<MapEmbedCard parts={['', '  ', null, undefined]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uses an explicit query, overriding parts/lat/lng', () => {
    render(<MapEmbedCard query="Explicit Query" parts={['ignored']} apiKey="key1" />);
    const iframe = screen.getByTitle('Map preview') as HTMLIFrameElement;
    expect(iframe.src).toContain('q=Explicit%20Query');
  });

  it('builds the query from lat/lng when both are present', () => {
    render(<MapEmbedCard lat={12.9716} lng={77.5946} apiKey="key1" />);
    const iframe = screen.getByTitle('Map preview') as HTMLIFrameElement;
    expect(iframe.src).toContain('q=12.9716%2C77.5946');
  });

  it('builds the query from address parts when lat/lng are absent', () => {
    render(<MapEmbedCard parts={['123 Main St', 'Bengaluru']} apiKey="key1" />);
    const iframe = screen.getByTitle('Map preview') as HTMLIFrameElement;
    expect(iframe.src).toContain('q=123%20Main%20St%2C%20Bengaluru');
  });

  it('renders the keyed embed src and the "Open in Maps" link when an apiKey is given', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="my-key" zoom={12} />);
    const iframe = screen.getByTitle('Map preview') as HTMLIFrameElement;
    expect(iframe.src).toBe('https://www.google.com/maps/embed/v1/place?key=my-key&q=Bengaluru&zoom=12');
    const link = screen.getByRole('link', { name: /open in maps/i });
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=Bengaluru');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the keyless embed src when keyless is true, ignoring any apiKey', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="my-key" keyless />);
    const iframe = screen.getByTitle('Map preview') as HTMLIFrameElement;
    expect(iframe.src).toBe('https://maps.google.com/maps?q=Bengaluru&z=14&output=embed');
  });

  it('shows the default missing-key fallback (no iframe) when no apiKey/keyless is given', () => {
    render(<MapEmbedCard parts={['Bengaluru']} />);
    expect(screen.queryByTitle('Map preview')).not.toBeInTheDocument();
    expect(screen.getByText('Add VITE_GOOGLE_MAP_API to preview the map here.')).toBeInTheDocument();
  });

  it('shows a custom missing-key fallback node when provided', () => {
    render(<MapEmbedCard parts={['Bengaluru']} missingKeyFallback={<div>Custom fallback</div>} />);
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('renders nothing when the key is missing and hideWhenKeyMissing is true', () => {
    const { container } = render(<MapEmbedCard parts={['Bengaluru']} hideWhenKeyMissing />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uses the title as the default heading text', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="key1" title="Venue location" />);
    expect(screen.getByTitle('Venue location')).toBeInTheDocument();
    expect(screen.getByText('Venue location')).toBeInTheDocument();
  });

  it('renders a custom heading node instead of the title text', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="key1" heading={<span>Custom heading</span>} />);
    expect(screen.getByText('Custom heading')).toBeInTheDocument();
  });

  it('places the icon at the start of the button when iconPosition="start"', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="key1" iconPosition="start" />);
    const link = screen.getByRole('link', { name: /open in maps/i });
    expect(link.querySelector('.MuiButton-startIcon svg')).toBeInTheDocument();
    expect(link.querySelector('.MuiButton-endIcon')).not.toBeInTheDocument();
  });

  it('places the icon at the end of the button by default', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="key1" />);
    const link = screen.getByRole('link', { name: /open in maps/i });
    expect(link.querySelector('.MuiButton-endIcon svg')).toBeInTheDocument();
  });

  it('supports a custom button label', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="key1" buttonLabel="Open Map" />);
    expect(screen.getByRole('link', { name: 'Open Map' })).toBeInTheDocument();
  });

  it('omits allowFullScreen from the iframe when explicitly set to false', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="key1" allowFullScreen={false} />);
    const iframe = screen.getByTitle('Map preview');
    expect(iframe).not.toHaveAttribute('allowfullscreen');
  });

  it('sets allowFullScreen on the iframe by default', () => {
    render(<MapEmbedCard parts={['Bengaluru']} apiKey="key1" />);
    const iframe = screen.getByTitle('Map preview');
    expect(iframe).toHaveAttribute('allowfullscreen');
  });

  it('applies custom sx/stackSx/frameSx/buttonSx overrides without breaking rendering', () => {
    render(
      <MapEmbedCard
        parts={['Bengaluru']}
        apiKey="key1"
        sx={{ mt: 3 }}
        stackSx={{ mb: 2 }}
        stackSpacing={1}
        frameSx={{ height: 100 }}
        buttonSx={{ color: 'red' }}
      />,
    );
    expect(screen.getByTitle('Map preview')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open in maps/i })).toBeInTheDocument();
  });
});
