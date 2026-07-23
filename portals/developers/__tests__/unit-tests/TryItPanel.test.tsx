import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TryItPanel from '../../src/pages/api-docs/TryItPanel';
import { API_ENDPOINTS } from '../../src/pages/api-docs/apiReference';

const listVenues = API_ENDPOINTS.find((e) => e.id === 'list-venues')!;
const venueSlots = API_ENDPOINTS.find((e) => e.id === 'venue-slots')!;
const bookSlot = API_ENDPOINTS.find((e) => e.id === 'book-slot')!;

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TryItPanel', () => {
  it('prompts for an API key and disables the button when none is set', () => {
    render(<TryItPanel endpoint={listVenues} apiKey="" />);
    expect(screen.getByText(/Paste an API key above/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
  });

  it('disables the button while a required param is missing, then enables it', () => {
    render(<TryItPanel endpoint={venueSlots} apiKey="k" />);
    const btn = screen.getByRole('button', { name: 'Send request' });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^venueId/), { target: { value: 'v1' } });
    expect(btn).toBeEnabled();
  });

  it('runs a GET request and pretty-prints a JSON response', async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      text: () => Promise.resolve('{"venues":[]}'),
    });
    render(<TryItPanel endpoint={listVenues} apiKey="mykey" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(screen.getByText('HTTP 200')).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/venues$/);
    expect(init.method).toBe('GET');
    expect(init.headers['x-api-key']).toBe('mykey');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
    expect(screen.getByText(/"venues"/)).toBeInTheDocument();
  });

  it('sends a JSON body with Content-Type when body params are filled and shows error status color', async () => {
    fetchMock.mockResolvedValue({
      status: 409,
      text: () => Promise.resolve('not json'),
    });
    render(<TryItPanel endpoint={bookSlot} apiKey="k" />);
    fireEvent.change(screen.getByLabelText(/^venueId/), { target: { value: 'v1' } });
    fireEvent.change(screen.getByLabelText(/^slotId/), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText(/external_ref/), { target: { value: 'order-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(screen.getByText('HTTP 409')).toBeInTheDocument());
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ external_ref: 'order-1' });
    // Non-JSON text is shown verbatim (JSON.parse throws → catch).
    expect(screen.getByText('not json')).toBeInTheDocument();
  });

  it('shows an error alert when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    render(<TryItPanel endpoint={listVenues} apiKey="k" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('network down'));
  });

  it('falls back to a generic error message when the thrown value has no message', async () => {
    fetchMock.mockRejectedValue({});
    render(<TryItPanel endpoint={listVenues} apiKey="k" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Request failed'));
  });
});
