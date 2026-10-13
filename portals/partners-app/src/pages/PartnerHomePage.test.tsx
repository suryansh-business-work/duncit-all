import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import PartnerHomePage from './PartnerHomePage';
import { renderWithProviders } from '../__tests__/render';

vi.mock('@duncit/dashboard', () => import('../__tests__/dashboard-mock'));

afterEach(cleanup);

describe('PartnerHomePage', () => {
  it('offers the three ways to become a partner', () => {
    renderWithProviders(<PartnerHomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Choose your partner path');
    for (const id of ['register-venue', 'become-host', 'list-products']) {
      expect(screen.getByTestId(`widget-${id}`)).toBeTruthy();
    }
    expect(within(screen.getByTestId('widget-register-venue')).getByRole('heading', { name: 'Register your venue' })).toBeTruthy();
  });

  it.each([
    ['register-venue', '/register-venue'],
    ['become-host', '/become-host'],
    ['list-products', '/list-products'],
  ])('starts the %s journey at %s', async (id, path) => {
    renderWithProviders(<PartnerHomePage />);
    fireEvent.click(within(screen.getByTestId(`widget-${id}`)).getByRole('link', { name: 'Start' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(path));
  });
});
