import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { useBranding } from '@/lib/useBranding';

const BRANDING_SUMMARY = gql`
  query AppBranding {
    branding {
      app_name
      logo_url
      portals_logo_url
      primary_color
      support_email
    }
  }
`;

const wrapper = (mocks: any[]) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={mocks} addTypename={false}>{children}</MockedProvider>;
  };

describe('useBranding', () => {
  it('returns sensible defaults while the query is in flight', () => {
    const { result } = renderHook(() => useBranding(), { wrapper: wrapper([]) });
    expect(result.current.logoUrl).toBe('');
    expect(result.current.appName).toBe('Duncit');
    expect(result.current.loading).toBe(true);
  });

  it('returns the server payload once resolved', async () => {
    const mocks = [
      {
        request: { query: BRANDING_SUMMARY },
        result: {
          data: {
            branding: {
              app_name: 'Acme',
              logo_url: 'https://cdn.example/logo.svg',
              portals_logo_url: '',
              primary_color: '#abcdef',
              support_email: 'help@acme.test',
            },
          },
        },
      },
    ];
    const { result } = renderHook(() => useBranding(), { wrapper: wrapper(mocks) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.appName).toBe('Acme');
    expect(result.current.logoUrl).toBe('https://cdn.example/logo.svg');
    expect(result.current.primaryColor).toBe('#abcdef');
    expect(result.current.supportEmail).toBe('help@acme.test');
  });

  it('falls back to defaults when the server returns null branding', async () => {
    const mocks = [
      {
        request: { query: BRANDING_SUMMARY },
        result: { data: { branding: null } },
      },
    ];
    const { result } = renderHook(() => useBranding(), { wrapper: wrapper(mocks) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logoUrl).toBe('');
    expect(result.current.appName).toBe('Duncit');
  });
});
