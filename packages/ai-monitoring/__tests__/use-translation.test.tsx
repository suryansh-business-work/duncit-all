/**
 * The package-scoped translator layering.
 *
 * The shared `useTranslation` ignores the fallback passed to it whenever a
 * LocaleProvider is mounted above — and mWeb plus all seventeen portals mount
 * one whose bundle has never heard of `aiMonitoring.*`. The hook layers the
 * package's own bundle UNDER the provider's translator so the chip never
 * renders raw keys; provider copy still wins where it exists.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { LocaleProvider } from '@duncit/app-settings';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AI_MONITORING_FALLBACK_FLAT, useTranslation } from '../src/mui/useTranslation';

describe('useTranslation', () => {
  it('answers from the package bundle when no provider is mounted', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.has('aiMonitoring.dismiss')).toBe(true);
    expect(result.current.t('aiMonitoring.dismiss')).toBe(
      AI_MONITORING_FALLBACK_FLAT['aiMonitoring.dismiss']
    );
  });

  it('does not claim keys the package never shipped', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.has('aiMonitoring.noSuchKey')).toBe(false);
    // The translator's last resort is the key itself, never a crash.
    expect(result.current.t('aiMonitoring.noSuchKey')).toBe('aiMonitoring.noSuchKey');
  });

  it('still resolves its own keys under a provider whose bundle lacks them', () => {
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <MockedProvider mocks={[]}>
        <LocaleProvider fallback={{}}>{children}</LocaleProvider>
      </MockedProvider>
    );
    const { result } = renderHook(() => useTranslation(), { wrapper });

    // The provider's translator has never heard of aiMonitoring.* — the
    // package's local bundle is what answers.
    expect(result.current.has('aiMonitoring.dismiss')).toBe(true);
    expect(result.current.t('aiMonitoring.dismiss')).toBe(
      AI_MONITORING_FALLBACK_FLAT['aiMonitoring.dismiss']
    );
  });
});
