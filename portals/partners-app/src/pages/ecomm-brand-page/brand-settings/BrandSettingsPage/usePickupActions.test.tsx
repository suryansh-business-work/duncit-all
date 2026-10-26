import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { usePickupActions } from './usePickupActions';

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => <MockedProvider mocks={[]}>{children}</MockedProvider>;

describe('usePickupActions', () => {
  it('has nothing to confirm until a removal is asked for, and confirming then does nothing', async () => {
    let refetched = 0;
    const { result } = renderHook(() => usePickupActions('b1', async () => void (refetched += 1)), { wrapper });
    expect(result.current.removal).toBeNull();
    await result.current.confirmRemoval();
    expect(refetched).toBe(0);
    expect(result.current.notice).toBeNull();
    expect(result.current.removal).toBeNull();
  });
});
