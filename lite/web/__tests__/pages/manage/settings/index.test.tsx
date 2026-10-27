import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SITE_URL } from '../../../../../shared/env';
import { SettingsTab } from '../../../../pages/manage/settings';
import { renderWithProviders } from '../../../test-utils';
import { hostedEvent } from '../manage-mocks';

const renderTab = (status: 'PUBLISHED' | 'CANCELLED' = 'PUBLISHED') =>
  renderWithProviders(<SettingsTab event={hostedEvent({ status })} onChanged={vi.fn()} />, { path: '/e/:slug/manage', route: '/e/garden-party/manage' });

describe('SettingsTab (More)', () => {
  it('gives the event page and calendar file as copyable absolute links', () => {
    renderTab();

    expect(screen.getByRole('textbox', { name: 'Event page' })).toHaveValue(`${SITE_URL}/e/garden-party`);
    expect(screen.getByRole('textbox', { name: 'Calendar file (.ics)' })).toHaveValue(`${SITE_URL}/ics/event/garden-party.ics`);
    expect(screen.getByRole('button', { name: 'Copy Event page' })).toBeInTheDocument();
  });

  it('offers a button snippet that opens the event in a new tab', () => {
    renderTab();

    expect(screen.getByRole('textbox', { name: 'Button snippet' })).toHaveValue(`<a href="${SITE_URL}/e/garden-party" target="_blank" rel="noopener">Register for the event</a>`);
  });

  it('lets a live event be edited, re-linked, co-hosted and cancelled', async () => {
    const { user } = renderTab();

    expect(screen.getByRole('link', { name: 'Edit event' })).toHaveAttribute('href', '/e/garden-party/edit');
    expect(screen.getByTestId('event-link-form')).toBeInTheDocument();
    expect(screen.getByTestId('co-host-list')).toBeInTheDocument();
    expect(screen.getByTestId('co-host-form')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-cancelled')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('settings-cancel'));

    const dialog = await screen.findByRole('dialog', { name: 'Cancel event' });
    expect(within(dialog).getByTestId('cancel-event-form')).toBeInTheDocument();
  });

  it('closes a cancelled event to changes, saying why', () => {
    renderTab('CANCELLED');

    expect(screen.getByTestId('settings-cancelled')).toHaveTextContent('This event was cancelled.');
    expect(screen.queryByRole('link', { name: 'Edit event' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-link-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('co-host-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-cancel')).not.toBeInTheDocument();
    // The links and the host list stay readable.
    expect(screen.getByRole('textbox', { name: 'Event page' })).toBeInTheDocument();
    expect(screen.getByTestId('co-host-list')).toBeInTheDocument();
  });
});
