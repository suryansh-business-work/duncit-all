import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { ConsoleShell } from '../../layout/ConsoleShell';
import { renderWithProviders } from '../test-utils';

vi.mock('../../../shared/session', async () => {
  const fixtures = await import('../fixtures');
  return { useLiteSession: () => fixtures.makeSession() };
});

const renderShell = (route = '/') =>
  renderWithProviders(
    <Routes>
      <Route element={<ConsoleShell />}>
        <Route path="/" element={<p>Dashboard body</p>} />
        <Route path="/events" element={<p>Events body</p>} />
      </Route>
    </Routes>,
    { route },
  );

/** The phone drawer: a modal that stays mounted while closed. */
const phoneDrawer = (): HTMLElement => {
  const element = document.querySelector('.MuiDrawer-modal');
  if (!(element instanceof HTMLElement)) throw new Error('no temporary drawer');
  return element;
};

describe('ConsoleShell', () => {
  it('offers a skip link to the main region, which holds the routed page', () => {
    renderShell();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#console-main');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'console-main');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(within(main).getByText('Dashboard body')).toBeInTheDocument();
  });

  it('keeps the desktop navigation visible and the phone drawer closed', () => {
    renderShell();
    expect(screen.getByRole('navigation', { name: 'Console navigation' })).toBeInTheDocument();
    expect(phoneDrawer()).toHaveAttribute('aria-hidden', 'true');
  });

  it('moves focus to the page region when the route changes', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(within(screen.getByRole('navigation', { name: 'Console navigation' })).getByRole('link', { name: 'Events' }));
    expect(await screen.findByText('Events body')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('opens the phone drawer from the app bar and closes it once a page is picked', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await waitFor(() => expect(phoneDrawer()).not.toHaveAttribute('aria-hidden', 'true'));
    await user.click(within(phoneDrawer()).getByRole('link', { name: 'Events' }));
    expect(await screen.findByText('Events body')).toBeInTheDocument();
    await waitFor(() => expect(phoneDrawer()).toHaveAttribute('aria-hidden', 'true'));
  });
});
