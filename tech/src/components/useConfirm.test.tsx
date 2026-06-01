import { describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ConfirmProvider, useConfirm } from './useConfirm';

const wrapper = ({ children }: { children: ReactNode }) => <ConfirmProvider>{children}</ConfirmProvider>;

describe('useConfirm', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useConfirm())).toThrow(/within <ConfirmProvider>/i);
  });

  it('resolves true when confirmed (with custom labels)', async () => {
    const { result } = renderHook(() => useConfirm(), { wrapper });
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current({ title: 'Proceed?', confirmLabel: 'Yes', cancelLabel: 'No', destructive: true });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    await expect(promise!).resolves.toBe(true);
  });

  it('resolves false when cancelled and uses default labels', async () => {
    const { result } = renderHook(() => useConfirm(), { wrapper });
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current({ title: 'Proceed?' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(promise!).resolves.toBe(false);
  });

  it('renders children passed to the provider', () => {
    render(
      <ConfirmProvider>
        <div data-testid="child">hi</div>
      </ConfirmProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
