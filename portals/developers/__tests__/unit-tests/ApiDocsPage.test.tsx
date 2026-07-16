import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const tryItSpy = vi.hoisted(() => vi.fn());

vi.mock('../../src/pages/api-docs/TryItPanel', () => ({
  default: (props: { apiKey: string }) => {
    tryItSpy(props);
    return <div data-testid="try-it">key:{props.apiKey}</div>;
  },
}));

import ApiDocsPage from '../../src/pages/api-docs/ApiDocsPage';
import { API_ENDPOINTS } from '../../src/pages/api-docs/apiReference';

describe('ApiDocsPage', () => {
  it('renders a heading and one accordion + Try-It panel per endpoint', () => {
    render(<ApiDocsPage />);
    expect(screen.getByRole('heading', { name: 'API Reference' })).toBeInTheDocument();
    // Method chips cover GET, POST and DELETE colour lookups.
    expect(screen.getAllByText('GET').length).toBeGreaterThan(0);
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
    expect(screen.getAllByTestId('try-it')).toHaveLength(API_ENDPOINTS.length);
  });

  it('passes the typed API key down to every Try-It panel', () => {
    render(<ApiDocsPage />);
    tryItSpy.mockClear();
    const input = screen.getByLabelText(/Your API key/);
    fireEvent.change(input, { target: { value: 'dk_live_abc' } });
    const panels = screen.getAllByTestId('try-it');
    expect(panels[0]).toHaveTextContent('key:dk_live_abc');
    expect(tryItSpy).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'dk_live_abc' }));
  });

  it('shows each endpoint title and a curl snippet with the placeholder key', () => {
    render(<ApiDocsPage />);
    expect(screen.getByText('List venues')).toBeInTheDocument();
    expect(screen.getAllByText(/YOUR_API_KEY/).length).toBeGreaterThan(0);
  });
});
