import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PortalModeGate from '../src/portal-mode/PortalModeGate';

const URL = 'https://server.duncit.com/graphql';

function mockFetchMode(mode: string | undefined) {
  const json = mode ? { data: { portalMode: { mode } } } : { data: {} };
  return vi.fn().mockResolvedValue({ json: () => Promise.resolve(json) });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('PortalModeGate', () => {
  it('renders children when the portal is LIVE', async () => {
    vi.stubGlobal('fetch', mockFetchMode('LIVE'));
    render(
      <PortalModeGate portalKey="crm" graphqlUrl={URL} appName="CRM">
        <div>portal body</div>
      </PortalModeGate>,
    );
    expect(await screen.findByText('portal body')).toBeInTheDocument();
  });

  it('renders children while a mode is missing from the response', async () => {
    const fetchMock = mockFetchMode(undefined);
    vi.stubGlobal('fetch', fetchMock);
    render(
      <PortalModeGate portalKey="crm" graphqlUrl={URL} appName="CRM">
        <div>still here</div>
      </PortalModeGate>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText('still here')).toBeInTheDocument();
  });

  it('blocks with the maintenance screen', async () => {
    vi.stubGlobal('fetch', mockFetchMode('MAINTENANCE'));
    render(
      <PortalModeGate portalKey="crm" graphqlUrl={URL} appName="CRM">
        <div>hidden body</div>
      </PortalModeGate>,
    );
    expect(await screen.findByText(/We’ll be back soon/)).toBeInTheDocument();
    expect(screen.queryByText('hidden body')).not.toBeInTheDocument();
  });

  it('blocks with the under-development screen', async () => {
    vi.stubGlobal('fetch', mockFetchMode('DEVELOPMENT'));
    render(
      <PortalModeGate portalKey="crm" graphqlUrl={URL} appName="CRM">
        <div>hidden body</div>
      </PortalModeGate>,
    );
    expect(await screen.findByText('Under development')).toBeInTheDocument();
  });

  it('fails open when the fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <PortalModeGate portalKey="crm" graphqlUrl={URL} appName="CRM">
        <div>fail-open body</div>
      </PortalModeGate>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText('fail-open body')).toBeInTheDocument();
  });

  it('re-polls on the configured interval and clears the timer on unmount', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetchMode('LIVE');
    vi.stubGlobal('fetch', fetchMock);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(
      <PortalModeGate portalKey="crm" graphqlUrl={URL} appName="CRM" pollMs={1000}>
        <div>body</div>
      </PortalModeGate>,
    );
    // initial check
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
