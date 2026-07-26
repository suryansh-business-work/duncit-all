import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));

import { useQuery } from '@apollo/client';
import { useBranding } from '../src/hooks/useBranding';
import { FALLBACK_ICONS } from '../src/fallback-icons';

const mockQuery = vi.mocked(useQuery);

describe('useBranding', () => {
  it('reports loading with the BUNDLED logo while the query is in flight', () => {
    mockQuery.mockReturnValue({ data: undefined, loading: true } as never);
    const { result } = renderHook(() => useBranding());
    // Never an empty src: a portal must not flash a broken image slot.
    expect(result.current).toMatchObject({
      logoUrl: FALLBACK_ICONS.logo,
      appName: 'Duncit',
      loading: true,
      isFallbackLogo: true,
    });
  });

  it('uses the bundled logo when the admin has configured none', () => {
    mockQuery.mockReturnValue({
      data: { branding: { logo_url: '', portals_logo_url: '  ' } },
      loading: false,
    } as never);
    const { result } = renderHook(() => useBranding());
    expect(result.current.logoUrl).toBe(FALLBACK_ICONS.logo);
    expect(result.current.isFallbackLogo).toBe(true);
  });

  it('prefers the portal logo and surfaces the full branding once loaded', () => {
    mockQuery.mockReturnValue({
      data: {
        branding: {
          portals_logo_url: '/p.png',
          logo_url: '/g.png',
          app_name: 'Acme',
          primary_color: '#123',
          support_email: 'help@acme.test',
        },
      },
      loading: false,
    } as never);
    const { result } = renderHook(() => useBranding());
    expect(result.current).toEqual({
      logoUrl: '/p.png',
      appName: 'Acme',
      primaryColor: '#123',
      supportEmail: 'help@acme.test',
      loading: false,
      isFallbackLogo: false,
    });
  });

  it('falls back to the global logo and clears loading once data exists', () => {
    mockQuery.mockReturnValue({ data: { branding: { logo_url: '/g.png' } }, loading: true } as never);
    const { result } = renderHook(() => useBranding());
    expect(result.current.logoUrl).toBe('/g.png');
    expect(result.current.appName).toBe('Duncit');
    expect(result.current.loading).toBe(false);
  });
});
