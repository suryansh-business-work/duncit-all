import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useBrandingAssets } from '../useBrandingAssets';

const BRANDING_ASSETS = gql`
  query BrandingAssets {
    branding {
      app_name
      logo_url
      mweb_favicon_url
      mweb_logo_url
      mweb_splash_url
      mweb_splash_type
      venues_card_video_url
    }
  }
`;

function makeWrapper(mocks: any[]) {
  return ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );
}

describe('useBrandingAssets', () => {
  it('returns defaults while loading (no data yet)', () => {
    const { result } = renderHook(() => useBrandingAssets(), {
      wrapper: makeWrapper([
        {
          request: { query: BRANDING_ASSETS },
          result: { data: { branding: null } },
        },
      ]),
    });

    // First render: loading true, no branding -> loading gate true, defaults returned
    expect(result.current.loading).toBe(true);
    expect(result.current.appName).toBe('Duncit');
    expect(result.current.logoUrl).toBe('');
    expect(result.current.faviconUrl).toBe('');
    expect(result.current.splashUrl).toBe('');
    expect(result.current.splashType).toBe('IMAGE');
    expect(result.current.venuesCardVideoUrl).toBe('');
  });

  it('maps fully-populated branding and prefers mweb_logo_url', async () => {
    const branding = {
      app_name: 'MyBrand',
      logo_url: 'global-logo.png',
      mweb_favicon_url: 'favicon.png',
      mweb_logo_url: 'mweb-logo.png',
      mweb_splash_url: 'splash.png',
      mweb_splash_type: 'VIDEO',
      venues_card_video_url: 'venue.mp4',
    };

    const { result } = renderHook(() => useBrandingAssets(), {
      wrapper: makeWrapper([
        {
          request: { query: BRANDING_ASSETS },
          result: { data: { branding } },
        },
      ]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.appName).toBe('MyBrand');
    expect(result.current.logoUrl).toBe('mweb-logo.png');
    expect(result.current.faviconUrl).toBe('favicon.png');
    expect(result.current.splashUrl).toBe('splash.png');
    expect(result.current.splashType).toBe('VIDEO');
    expect(result.current.venuesCardVideoUrl).toBe('venue.mp4');
  });

  it('falls back to global logo_url and defaults for empty fields', async () => {
    const branding = {
      app_name: '',
      logo_url: 'global-logo.png',
      mweb_favicon_url: '',
      mweb_logo_url: '',
      mweb_splash_url: '',
      mweb_splash_type: '',
      venues_card_video_url: '',
    };

    const { result } = renderHook(() => useBrandingAssets(), {
      wrapper: makeWrapper([
        {
          request: { query: BRANDING_ASSETS },
          result: { data: { branding } },
        },
      ]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // app_name empty -> default; mweb_logo_url empty -> global logo_url
    expect(result.current.appName).toBe('Duncit');
    expect(result.current.logoUrl).toBe('global-logo.png');
    expect(result.current.splashType).toBe('IMAGE');
  });
});
