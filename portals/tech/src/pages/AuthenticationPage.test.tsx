import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('./JwtExpirySection', () => ({
  default: (p: { onToast: (msg: string) => void }) => (
    <button type="button" onClick={() => p.onToast('Toasted!')}>raise-toast</button>
  ),
}));

import AuthenticationPage from './AuthenticationPage';

afterEach(() => vi.useRealTimers());

describe('AuthenticationPage', () => {
  it('surfaces a toast from the JWT section and auto-dismisses it', () => {
    vi.useFakeTimers();
    render(<AuthenticationPage />);
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'raise-toast' }));
    expect(screen.getByText('Toasted!')).toBeInTheDocument();
    // autoHideDuration elapses -> Snackbar onClose -> setToast(null)
    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText('Toasted!')).not.toBeInTheDocument();
  });
});
