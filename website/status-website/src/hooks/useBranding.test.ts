import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBranding } from './useBranding';
import { fetchBranding } from '../api';

vi.mock('../api', () => ({ fetchBranding: vi.fn() }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('useBranding', () => {
  it('keeps the bundled defaults and sets the document title when there is no remote brand', async () => {
    vi.mocked(fetchBranding).mockResolvedValue(null);
    const { result } = renderHook(() => useBranding());

    await waitFor(() => expect(document.title).toBe('Duncit Status'));
    expect(result.current).toEqual({
      appName: 'Duncit',
      logoUrl: '/duncit-logo.svg',
      primaryColor: null,
    });
  });

  it('applies a remote brand', async () => {
    vi.mocked(fetchBranding).mockResolvedValue({
      app_name: 'Acme',
      logo_url: '/acme.png',
      primary_color: '#0a0',
    });
    const { result } = renderHook(() => useBranding());

    await waitFor(() => expect(result.current.appName).toBe('Acme'));
    expect(result.current.logoUrl).toBe('/acme.png');
    expect(result.current.primaryColor).toBe('#0a0');
    expect(document.title).toBe('Acme Status');
  });

  it('falls back per-field when the remote brand has empty values', async () => {
    vi.mocked(fetchBranding).mockResolvedValue({ app_name: '', logo_url: '', primary_color: '' });
    const { result } = renderHook(() => useBranding());

    await waitFor(() => expect(document.title).toBe('Duncit Status'));
    expect(result.current).toEqual({
      appName: 'Duncit',
      logoUrl: '/duncit-logo.svg',
      primaryColor: null,
    });
  });

  it('keeps the defaults when the request throws', async () => {
    vi.mocked(fetchBranding).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useBranding());

    await waitFor(() => expect(document.title).toBe('Duncit Status'));
    expect(result.current.appName).toBe('Duncit');
  });
});
