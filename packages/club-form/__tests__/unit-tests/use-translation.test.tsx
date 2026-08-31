/**
 * The package-scoped translator layering.
 *
 * The shared `useTranslation` ignores the fallback passed to it whenever a
 * LocaleProvider is mounted above — and every host surface mounts one whose
 * bundle has never heard of `clubForm.*`. The hook layers the package's own
 * bundle UNDER the provider's translator so the form never renders raw keys;
 * provider copy still wins where it exists, which is how a translated entry
 * reaches the package.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { LocaleProvider } from '@duncit/app-settings';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CLUBFORM_FALLBACK_FLAT, useTranslation } from '../../src/i18n/useTranslation';

const providerWith =
  (fallback: Record<string, string>) =>
  ({ children }: Readonly<{ children: ReactNode }>) => (
    <MockedProvider mocks={[]}>
      <LocaleProvider fallback={fallback}>{children}</LocaleProvider>
    </MockedProvider>
  );

describe('useTranslation', () => {
  it('answers from the package bundle when no provider is mounted', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.has('clubForm.common.clubAdmin')).toBe(true);
    expect(result.current.t('clubForm.common.clubAdmin')).toBe(
      CLUBFORM_FALLBACK_FLAT['clubForm.common.clubAdmin'],
    );
  });

  it('does not claim keys the package never shipped', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.has('clubForm.noSuchKey')).toBe(false);
    // The translator's last resort is the key itself, never a crash.
    expect(result.current.t('clubForm.noSuchKey')).toBe('clubForm.noSuchKey');
  });

  it('still resolves its own keys under a provider whose bundle lacks them', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper: providerWith({}) });

    // The provider's translator has never heard of clubForm.* — the package's
    // local bundle is what answers.
    expect(result.current.has('clubForm.adminsSection.assignClubAdmin')).toBe(true);
    expect(result.current.t('clubForm.adminsSection.assignClubAdmin')).toBe(
      CLUBFORM_FALLBACK_FLAT['clubForm.adminsSection.assignClubAdmin'],
    );
    expect(result.current.has('clubForm.noSuchKey')).toBe(false);
  });

  it("lets the provider's copy win over the bundled fallback", () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: providerWith({ 'clubForm.common.cancel': 'Abandon changes' }),
    });

    expect(result.current.has('clubForm.common.cancel')).toBe(true);
    expect(result.current.t('clubForm.common.cancel')).toBe('Abandon changes');
    // Keys the provider does not carry still fall through to the bundle.
    expect(result.current.t('clubForm.common.clubAdmin')).toBe('Club Admin');
  });
});
