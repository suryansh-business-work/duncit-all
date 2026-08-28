/**
 * Which header features this console offers, per Admin > Portal App Settings.
 * Fails open — a server blip or an unregistered portal must not silently
 * strip the chat/apps buttons.
 */
import { MockedProvider } from '@apollo/client/testing';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import { usePortalAppFeatures } from '../src/chrome/usePortalAppFeatures';
import { gql } from '@apollo/client';

const PORTAL_APP_FEATURES = gql`
  query PortalAppFeatures($key: String!) {
    portalMode(key: $key) {
      key
      chat_enabled
      apps_enabled
    }
  }
`;

const wrapper =
  (mocks: readonly unknown[]) =>
  ({ children }: { children: ReactNode }) =>
    <MockedProvider mocks={mocks as never}>{children}</MockedProvider>;

describe('usePortalAppFeatures', () => {
  it('turns everything on for a portal with no registry row at all', async () => {
    const mocks = [
      {
        request: { query: PORTAL_APP_FEATURES, variables: { key: 'crm' } },
        result: { data: { portalMode: null } },
      },
    ];
    const { result } = renderHook(() => usePortalAppFeatures('crm'), { wrapper: wrapper(mocks) });

    await waitFor(() => expect(result.current).toEqual({ chat: true, apps: true }));
  });

  it('reads the server explicitly turning a feature off', async () => {
    const mocks = [
      {
        request: { query: PORTAL_APP_FEATURES, variables: { key: 'finance' } },
        result: { data: { portalMode: { key: 'finance', chat_enabled: false, apps_enabled: true } } },
      },
    ];
    const { result } = renderHook(() => usePortalAppFeatures('finance'), { wrapper: wrapper(mocks) });

    await waitFor(() => expect(result.current).toEqual({ chat: false, apps: true }));
  });

  it('turns everything on with no portal key to look up at all', () => {
    const { result } = renderHook(() => usePortalAppFeatures(undefined), { wrapper: wrapper([]) });

    expect(result.current).toEqual({ chat: true, apps: true });
  });
});
