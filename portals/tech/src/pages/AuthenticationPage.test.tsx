import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('./JwtExpirySection', () => ({
  default: (p: { onToast: (msg: string) => void }) => (
    <button type="button" onClick={() => p.onToast('Toasted!')}>raise-toast</button>
  ),
}));

import AuthenticationPage from './AuthenticationPage';

describe('AuthenticationPage', () => {
  it('surfaces a toast from the JWT section and lets it dismiss', async () => {
    render(<AuthenticationPage />);
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'raise-toast' }));
    expect(await screen.findByText('Toasted!')).toBeInTheDocument();
  });
});
