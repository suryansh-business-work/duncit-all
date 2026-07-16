import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoogleMapPreview from '../../src/components/GoogleMapPreview';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GoogleMapPreview', () => {
  it('returns nothing when there is no query to show', () => {
    const { container } = render(<GoogleMapPreview parts={[null, undefined, '  ']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('builds the query from address parts and shows the env-key fallback text', () => {
    render(<GoogleMapPreview parts={['Cafe', ' Bandra ', null, 'Mumbai']} />);
    expect(screen.getByText('Map preview')).toBeInTheDocument();
    expect(screen.getByText('Add VITE_GOOGLE_MAP_API to preview the map here.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open Map/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('Cafe%2C%20Bandra%2C%20Mumbai'));
  });

  it('renders the embed iframe from lat/lng when the API key is present', () => {
    vi.stubEnv('VITE_GOOGLE_MAP_API', 'test-key');
    render(<GoogleMapPreview title="Venue" parts={['ignored']} lat={19.1} lng={72.8} />);
    const iframe = screen.getByTitle('Venue');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('key=test-key'));
    expect(iframe).toHaveAttribute('src', expect.stringContaining('q=19.1%2C72.8'));
  });
});
