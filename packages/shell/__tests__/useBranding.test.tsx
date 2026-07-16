import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));

import { useQuery } from '@apollo/client';
import { useBranding } from '../src/hooks/useBranding';

const mockQuery = vi.mocked(useQuery);

describe('useBranding', () => {
  it('reports loading with defaults while the query is in flight', () => {
    mockQuery.mockReturnValue({ data: undefined, loading: true } as never);
    const { result } = renderHook(() => useBranding());
    expect(result.current).toMatchObject({ logoUrl: '', appName: 'Duncit', loading: true });
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
