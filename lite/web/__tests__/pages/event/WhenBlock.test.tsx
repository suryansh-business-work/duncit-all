import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WhenBlock } from '../../../pages/event/WhenBlock';
import { eventFixture, renderWithProviders } from '../../test-utils';

/** jsdom cannot follow a link; stop it trying so a click only runs the page's own handler. */
const stopNavigation = (event: MouseEvent) => event.preventDefault();

describe('WhenBlock', () => {
  beforeEach(() => {
    globalThis.addEventListener('click', stopNavigation, true);
  });
  afterEach(() => {
    globalThis.removeEventListener('click', stopNavigation, true);
  });

  it('shows the date and time on the host’s clock, with the zone', () => {
    // 13:30–16:00 UTC is 7:00–9:30 PM in Delhi.
    renderWithProviders(<WhenBlock event={eventFixture()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Sat, 21 Nov 2026' })).toBeInTheDocument();
    expect(screen.getByText('7:00 PM – 9:30 PM (Asia/Kolkata)')).toBeInTheDocument();
  });

  it('adds the end date when the event runs past midnight', () => {
    renderWithProviders(<WhenBlock event={eventFixture({ start_at: '2026-11-21T16:30:00.000Z', end_at: '2026-11-21T20:30:00.000Z' })} />);

    // 10:00 PM on the 21st to 2:00 AM on the 22nd in Delhi.
    expect(screen.getByText('10:00 PM – Sun, 22 Nov 2026 · 2:00 AM (Asia/Kolkata)')).toBeInTheDocument();
  });

  it('opens an "Add to calendar" menu with a prefilled Google link and the .ics file', async () => {
    const { user } = renderWithProviders(<WhenBlock event={eventFixture()} />);
    const trigger = screen.getByRole('button', { name: 'Add to calendar' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');

    await user.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const controlled = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    expect(controlled).toContainElement(menu);

    const google = screen.getByRole('menuitem', { name: 'Google Calendar' });
    const url = new URL(google.getAttribute('href') ?? '');
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('text')).toBe('Garden Party');
    expect(url.searchParams.get('dates')).toBe('20261121T133000Z/20261121T160000Z');
    expect(url.searchParams.get('location')).toBe('Lodhi Garden, Lodhi Road, New Delhi');
    expect(google).toHaveAttribute('target', '_blank');
    expect(google).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.getByRole('menuitem', { name: 'Download .ics file' })).toHaveAttribute('href', '/ics/event/garden-party.ics');
  });

  it('names an online event "Online" in the Google entry', async () => {
    const { user } = renderWithProviders(<WhenBlock event={eventFixture({ location_type: 'VIRTUAL', venue_name: null, address: null })} />);
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }));

    const google = await screen.findByRole('menuitem', { name: 'Google Calendar' });
    expect(new URL(google.getAttribute('href') ?? '').searchParams.get('location')).toBe('Online');
  });

  it('closes the menu once a calendar is picked', async () => {
    const { user } = renderWithProviders(<WhenBlock event={eventFixture()} />);
    const trigger = screen.getByRole('button', { name: 'Add to calendar' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: 'Download .ics file' }));

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the menu on Escape without picking anything', async () => {
    const { user } = renderWithProviders(<WhenBlock event={eventFixture()} />);
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }));
    await screen.findByRole('menu');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
