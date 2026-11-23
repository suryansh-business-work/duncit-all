import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoogleMapPreview from '../../src/components/GoogleMapPreview';

// The key comes from the server's publicClientConfig (Tech → Environment →
// Google Map) through @duncit/location; that hook has its own tests.
const mapsKey = vi.fn(() => '');
vi.mock('@duncit/location', () => ({ useGoogleMapsApiKey: () => mapsKey() }));

beforeEach(() => {
  mapsKey.mockReset();
  mapsKey.mockReturnValue('');
});

describe('GoogleMapPreview', () => {
  it('returns nothing when there is no query to show', () => {
    const { container } = render(<GoogleMapPreview parts={[null, undefined, '  ']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('builds the query from address parts and shows the key-missing text while the Tech portal has no key', () => {
    render(<GoogleMapPreview parts={['Cafe', ' Bandra ', null, 'Mumbai']} />);
    expect(screen.getByText('Map preview')).toBeInTheDocument();
    expect(screen.getByText('Add VITE_GOOGLE_MAP_API to preview the map here.')).toBeInTheDocument();
    expect(screen.queryByTitle('Map preview')).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open Map/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('Cafe%2C%20Bandra%2C%20Mumbai'));
  });

  it('renders the embed iframe from lat/lng with the runtime key', () => {
    mapsKey.mockReturnValue('runtime-key');
    render(<GoogleMapPreview title="Venue" parts={['ignored']} lat={19.1} lng={72.8} />);
    const iframe = screen.getByTitle('Venue');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('key=runtime-key'));
    expect(iframe).toHaveAttribute('src', expect.stringContaining('q=19.1%2C72.8'));
    expect(screen.queryByText('Add VITE_GOOGLE_MAP_API to preview the map here.')).not.toBeInTheDocument();
  });

  it('escapes a key with reserved characters in the embed URL', () => {
    mapsKey.mockReturnValue('a&b=c');
    render(<GoogleMapPreview title="Venue" parts={['Cafe']} />);
    expect(screen.getByTitle('Venue')).toHaveAttribute('src', expect.stringContaining('key=a%26b%3Dc'));
  });
});
