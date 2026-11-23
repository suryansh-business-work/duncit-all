import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { answerQuery, queryOptions, resetApollo } from '../mocks/reel-apollo-mock';
import { REMOTION_LICENSE, useRemotionLicenseKey } from '../../src/pages/reels/license';

vi.mock('@apollo/client/react', async (io) => ({ ...(await io()), ...(await import('../mocks/reel-apollo-mock')).hooks }));

beforeEach(() => {
  resetApollo();
});

const answer = (remotion_license_key: string | null) => answerQuery(REMOTION_LICENSE, { data: { publicClientConfig: { remotion_license_key } } });

describe('useRemotionLicenseKey', () => {
  it('reads the licence from the public client config, cache-first', () => {
    renderHook(() => useRemotionLicenseKey());
    expect(queryOptions.get(REMOTION_LICENSE)).toEqual({ fetchPolicy: 'cache-first' });
  });

  it('is null until the config arrives', () => {
    const { result } = renderHook(() => useRemotionLicenseKey());
    expect(result.current).toBeNull();
  });

  it('is null while Tech → Remotion holds no licence (blank, whitespace or null)', () => {
    answer('');
    expect(renderHook(() => useRemotionLicenseKey()).result.current).toBeNull();
    answer('   ');
    expect(renderHook(() => useRemotionLicenseKey()).result.current).toBeNull();
    answer(null);
    expect(renderHook(() => useRemotionLicenseKey()).result.current).toBeNull();
  });

  it('is the configured key, trimmed', () => {
    answer(' rm_pub_duncit ');
    expect(renderHook(() => useRemotionLicenseKey()).result.current).toBe('rm_pub_duncit');
  });
});
