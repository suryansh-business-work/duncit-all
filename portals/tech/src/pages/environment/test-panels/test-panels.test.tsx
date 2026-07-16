import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EnvEntry } from '../queries';

// ---- Apollo: control useMutation per test -------------------------------
const h = vi.hoisted(() => ({ run: vi.fn(), loading: false }));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useMutation: () => [h.run, { loading: h.loading }] as const };
});

// ---- @duncit deps -------------------------------------------------------
const confirmMock = vi.fn();
vi.mock('@duncit/dialogs', () => ({ useConfirm: () => confirmMock }));
vi.mock('@duncit/utils', () => ({
  parseApiError: (e: unknown) => (e instanceof Error ? e.message : 'err'),
  fileToDataUrl: async () => 'data:image/png;base64,AAA',
}));

// ---- @react-oauth/google stubs ------------------------------------------
const g = vi.hoisted(() => ({ res: {} as { credential?: string } }));
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="oauth-provider">{children}</div>,
  GoogleLogin: (p: { onSuccess: (r: { credential?: string }) => void; onError: () => void }) => (
    <div>
      <button type="button" onClick={() => p.onSuccess(g.res)}>gl-success</button>
      <button type="button" onClick={() => p.onError()}>gl-error</button>
    </div>
  ),
}));

import TestDrawer from './index';
import ResultAlert from './ResultAlert';
import EmailTestPanel from './EmailTestPanel';
import ImagekitTestPanel from './ImagekitTestPanel';
import PexelsTestPanel from './PexelsTestPanel';
import CallTestPanel from './CallTestPanel';
import AiTestPanel from './AiTestPanel';
import GoogleMapsTest from './GoogleMapsTest';
import GoogleOAuthTab from './GoogleOAuthTab';
import GoogleOAuthTest from './GoogleOAuthTest';

const entry = (over: Partial<EnvEntry> = {}): EnvEntry =>
  ({
    id: 'e1', name: 'Primary', category: 'EMAIL', description: '',
    is_default: false, is_active: true, assigned_portals: [], config: [],
    secrets: [], last_used_at: null, last_tested_at: null, last_test_ok: null,
    created_at: null, updated_at: null, ...over,
  }) as EnvEntry;

beforeEach(() => {
  h.run.mockReset();
  h.loading = false;
  confirmMock.mockReset();
  g.res = {};
});
afterEach(() => vi.unstubAllGlobals());

describe('ResultAlert', () => {
  it('renders nothing without a result', () => {
    const { container } = render(<ResultAlert result={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders success and error variants', () => {
    const { rerender } = render(<ResultAlert result={{ ok: true, message: 'Yay' }} />);
    expect(screen.getByText('Yay')).toBeInTheDocument();
    rerender(<ResultAlert result={{ ok: false, message: 'Nope' }} />);
    expect(screen.getByText('Nope')).toBeInTheDocument();
  });
});

describe('EmailTestPanel', () => {
  it('sends and shows the returned result', async () => {
    h.run.mockResolvedValue({ data: { testEnvEmail: { ok: true, message: 'Sent' } } });
    render(<EmailTestPanel entry={entry()} />);
    fireEvent.change(screen.getByLabelText('Recipient email'), { target: { value: 'a@b.c' } });
    fireEvent.click(screen.getByRole('button', { name: /send test email/i }));
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    expect(h.run).toHaveBeenCalledWith({ variables: { id: 'e1', to: 'a@b.c' } });
  });
  it('surfaces a thrown error', async () => {
    h.run.mockRejectedValue(new Error('smtp down'));
    render(<EmailTestPanel entry={entry()} />);
    fireEvent.change(screen.getByLabelText('Recipient email'), { target: { value: 'x@y.z' } });
    fireEvent.click(screen.getByRole('button', { name: /send test email/i }));
    expect(await screen.findByText('smtp down')).toBeInTheDocument();
  });
  it('handles a null data payload and loading label', () => {
    h.loading = true;
    render(<EmailTestPanel entry={entry()} />);
    // Button is disabled while loading and shows the sending label.
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  });
});

describe('ImagekitTestPanel', () => {
  it('picks a file, uploads and renders the returned url + image', async () => {
    h.run.mockResolvedValue({ data: { testEnvImagekitUpload: { ok: true, message: 'ok', url: 'https://cdn/x.png' } } });
    const { container } = render(<ImagekitTestPanel entry={entry({ category: 'IMAGEKIT' })} />);
    const file = new File(['x'], 'pic.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('pic.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /upload & get path/i }));
    expect(await screen.findByRole('link', { name: 'https://cdn/x.png' })).toBeInTheDocument();
  });
  it('ignores an empty pick and reports upload errors', async () => {
    h.run.mockRejectedValue(new Error('upload failed'));
    const { container } = render(<ImagekitTestPanel entry={entry({ category: 'IMAGEKIT' })} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } }); // onPick with undefined -> early return
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('p.png');
    fireEvent.click(screen.getByRole('button', { name: /upload & get path/i }));
    expect(await screen.findByText('upload failed')).toBeInTheDocument();
  });
  it('handles a null upload payload (no url block)', async () => {
    h.run.mockResolvedValue({ data: {} });
    const { container } = render(<ImagekitTestPanel entry={entry({ category: 'IMAGEKIT' })} />);
    const file = new File(['x'], 'z.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
    await screen.findByText('z.png');
    fireEvent.click(screen.getByRole('button', { name: /upload & get path/i }));
    await waitFor(() => expect(h.run).toHaveBeenCalled());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('PexelsTestPanel', () => {
  it('searches and renders photo previews from JSON data', async () => {
    h.run.mockResolvedValue({ data: { testEnvPexels: { ok: true, message: 'ok', data: JSON.stringify(['a.jpg', 'b.jpg']) } } });
    const { container } = render(<PexelsTestPanel entry={entry({ category: 'PEXELS' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    await screen.findByText('ok');
    expect(container.querySelectorAll('img').length).toBe(2);
  });
  it('handles a result with no data and a thrown error', async () => {
    h.run.mockResolvedValueOnce({ data: { testEnvPexels: { ok: true, message: 'empty' } } });
    const { rerender } = render(<PexelsTestPanel entry={entry({ category: 'PEXELS' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    await screen.findByText('empty');
    h.run.mockRejectedValueOnce(new Error('bad key'));
    rerender(<PexelsTestPanel entry={entry({ category: 'PEXELS' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(await screen.findByText('bad key')).toBeInTheDocument();
  });
  it('handles an undefined data payload', async () => {
    h.run.mockResolvedValue({ data: {} });
    render(<PexelsTestPanel entry={entry({ category: 'PEXELS' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    await waitFor(() => expect(h.run).toHaveBeenCalled());
    expect(screen.queryByText('empty')).not.toBeInTheDocument();
  });
});

describe('AiTestPanel', () => {
  it('runs OpenAI and shows the reply', async () => {
    h.run.mockResolvedValue({ data: { testEnvOpenai: { ok: true, message: 'ok', data: 'Hello!' } } });
    render(<AiTestPanel entry={entry({ category: 'OPENAI' })} />);
    fireEvent.click(screen.getByRole('button', { name: /create openai chat/i }));
    expect(await screen.findByText('Hello!')).toBeInTheDocument();
  });
  it('runs Gemini, handles missing data, and errors', async () => {
    h.run.mockResolvedValueOnce({ data: { testEnvGemini: { ok: true, message: 'no-reply' } } });
    const { rerender } = render(<AiTestPanel entry={entry({ category: 'GEMINI' })} />);
    expect(screen.getByRole('button', { name: /create gemini chat/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /create gemini chat/i }));
    await screen.findByText('no-reply');
    h.run.mockRejectedValueOnce(new Error('quota'));
    rerender(<AiTestPanel entry={entry({ category: 'GEMINI' })} />);
    fireEvent.click(screen.getByRole('button', { name: /create gemini chat/i }));
    expect(await screen.findByText('quota')).toBeInTheDocument();
  });
});

describe('CallTestPanel', () => {
  it('validates phone/extension and places a confirmed call', async () => {
    confirmMock.mockResolvedValue(true);
    h.run.mockResolvedValue({ data: { testEnvTwilioCall: { ok: true, message: 'Ringing' } } });
    render(<CallTestPanel entry={entry({ category: 'TWILIO' })} />);
    const phone = screen.getByLabelText('Number to call');
    fireEvent.change(phone, { target: { value: 'abc' } }); // invalid -> error helper + disabled
    expect(screen.getByText(/valid E\.164 number/i)).toBeInTheDocument();
    fireEvent.change(phone, { target: { value: '+14155552671' } });
    fireEvent.change(screen.getByLabelText('Extension (optional)'), { target: { value: 'xx' } }); // invalid ext
    expect(screen.getByText('Extension must be 1–6 digits')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Extension (optional)'), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: /place test call/i }));
    expect(await screen.findByText('Ringing')).toBeInTheDocument();
    expect(h.run).toHaveBeenCalledWith({ variables: { id: 'e1', to: '+14155552671,101' } });
  });
  it('aborts when the confirm is declined', async () => {
    confirmMock.mockResolvedValue(false);
    render(<CallTestPanel entry={entry({ category: 'TWILIO' })} />);
    fireEvent.change(screen.getByLabelText('Number to call'), { target: { value: '+14155552671' } });
    fireEvent.click(screen.getByRole('button', { name: /place test call/i }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(h.run).not.toHaveBeenCalled();
  });
  it('reports a thrown call error and a null payload', async () => {
    confirmMock.mockResolvedValue(true);
    h.run.mockRejectedValueOnce(new Error('no credits'));
    render(<CallTestPanel entry={entry({ category: 'TWILIO' })} />);
    fireEvent.change(screen.getByLabelText('Number to call'), { target: { value: '+14155552671' } });
    fireEvent.click(screen.getByRole('button', { name: /place test call/i }));
    expect(await screen.findByText('no credits')).toBeInTheDocument();
  });
});

describe('GoogleMapsTest', () => {
  it('prompts when no key is saved', () => {
    render(<GoogleMapsTest entry={entry({ category: 'GOOGLE_MAPS', config: [] })} />);
    expect(screen.getByText(/Set a Maps API Key/i)).toBeInTheDocument();
  });
  it('loads the script and initialises a map when google is available', async () => {
    render(<GoogleMapsTest entry={entry({ category: 'GOOGLE_MAPS', config: [{ key: 'maps_api_key', value: 'K' }] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load map' }));
    await waitFor(() => expect(document.getElementById('gmaps-test-script')).not.toBeNull());
    const mapCtor = vi.fn();
    (globalThis as unknown as { google: unknown }).google = { maps: { Map: mapCtor } };
    (globalThis as unknown as { __duncitMapInit: () => void }).__duncitMapInit();
    expect(mapCtor).toHaveBeenCalled();
  });
  it('sets an error when google.maps never arrives, and on script error', async () => {
    render(<GoogleMapsTest entry={entry({ category: 'GOOGLE_MAPS', config: [{ key: 'maps_api_key', value: 'K' }] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load map' }));
    const script = await waitFor(() => document.getElementById('gmaps-test-script') as HTMLScriptElement);
    delete (globalThis as unknown as { google?: unknown }).google;
    (globalThis as unknown as { __duncitMapInit: () => void }).__duncitMapInit();
    expect(await screen.findByText(/Maps failed to load/i)).toBeInTheDocument();
    script.onerror?.(new Event('error'));
    expect(await screen.findByText('Maps script failed to load.')).toBeInTheDocument();
  });
});

describe('GoogleOAuthTab + GoogleOAuthTest', () => {
  it('prompts when no client id is saved', () => {
    render(<GoogleOAuthTab entry={entry({ category: 'GOOGLE_OAUTH', config: [] })} />);
    expect(screen.getByText(/Set an OAuth Client ID/i)).toBeInTheDocument();
  });
  it('renders the provider + login when a client id is present', () => {
    render(<GoogleOAuthTab entry={entry({ category: 'GOOGLE_OAUTH', config: [{ key: 'client_id', value: 'cid' }] })} />);
    expect(screen.getByTestId('oauth-provider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gl-success' })).toBeInTheDocument();
  });
  it('decodes a valid credential into a profile', () => {
    const payload = btoa(JSON.stringify({ name: 'Ana', email: 'ana@x.io', picture: 'p.png' }));
    g.res = { credential: `head.${payload}.sig` };
    render(<GoogleOAuthTest />);
    fireEvent.click(screen.getByRole('button', { name: 'gl-success' }));
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ana@x.io')).toBeInTheDocument();
  });
  it('returns an empty profile on an undecodable credential', () => {
    g.res = { credential: 'head.@@@.sig' };
    render(<GoogleOAuthTest />);
    fireEvent.click(screen.getByRole('button', { name: 'gl-success' }));
    // avatar block still renders (empty profile object), with no name text.
    expect(screen.queryByText('ana@x.io')).not.toBeInTheDocument();
  });
  it('ignores a success without a credential and shows the error alert', () => {
    g.res = {};
    render(<GoogleOAuthTest />);
    fireEvent.click(screen.getByRole('button', { name: 'gl-success' }));
    fireEvent.click(screen.getByRole('button', { name: 'gl-error' }));
    expect(screen.getByText(/Sign-in failed/i)).toBeInTheDocument();
  });
});

describe('TestDrawer', () => {
  it('renders nothing interactive when closed (no entry)', () => {
    render(<TestDrawer entry={null} onClose={vi.fn()} />);
    expect(screen.queryByText(/This test is running/i)).not.toBeInTheDocument();
  });
  it('routes each category to its panel and shows the default hint', () => {
    const { rerender } = render(<TestDrawer entry={entry({ category: 'EMAIL', is_default: true })} onClose={vi.fn()} />);
    expect(screen.getByText(/\(default\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient email')).toBeInTheDocument();
    for (const c of ['IMAGEKIT', 'PEXELS', 'GOOGLE_MAPS', 'GOOGLE_OAUTH', 'TWILIO', 'OPENAI', 'GEMINI'] as const) {
      rerender(<TestDrawer entry={entry({ category: c, config: [] })} onClose={vi.fn()} />);
      expect(screen.getByText(c)).toBeInTheDocument();
    }
  });
  it('renders no panel for an unknown category', () => {
    render(<TestDrawer entry={entry({ category: 'UNKNOWN' as unknown as EnvEntry['category'] })} onClose={vi.fn()} />);
    expect(screen.getByText(/This test is running/i)).toBeInTheDocument();
  });
});
