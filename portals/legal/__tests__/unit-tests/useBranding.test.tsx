import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { useBranding } from '../../src/lib/useBranding';

const BRANDING = gql`
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

const wrapper = (mocks: MockedResponse[]) =>
  ({ children }: { children: ReactNode }) =>
    (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );

describe('useBranding', () => {
  it('starts in a loading state then exposes the fetched branding', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: BRANDING },
        result: {
          data: {
            branding: {
              app_name: 'Acme',
              logo_url: '/acme.png',
              primary_color: '#abcdef',
              support_email: 'help@acme.com',
            },
          },
        },
      },
    ];
    const { result } = renderHook(() => useBranding(), { wrapper: wrapper(mocks) });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.appName).toBe('Acme');
    expect(result.current.logoUrl).toBe('/acme.png');
    expect(result.current.primaryColor).toBe('#abcdef');
    expect(result.current.supportEmail).toBe('help@acme.com');
  });

  it('falls back to bundled defaults when branding is empty', async () => {
    const mocks: MockedResponse[] = [
      { request: { query: BRANDING }, result: { data: { branding: null } } },
    ];
    const { result } = renderHook(() => useBranding(), { wrapper: wrapper(mocks) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.appName).toBe('Duncit');
    expect(result.current.logoUrl).toBe('');
    expect(result.current.primaryColor).toBeUndefined();
  });
});
