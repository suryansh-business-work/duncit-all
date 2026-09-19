import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import LeadContactActions from '@/components/LeadContactActions';
import ContactsTab from '@/components/contacts-tab';
import type { CrmContact } from '@/api/crm.types';
import { renderWithApollo } from '../helpers/renderWithApollo';

/**
 * The compose window itself (SMTP / Twilio providers, templates, rich text) is
 * covered end-to-end; here it is a double that shows who it was opened for and
 * reports back the way the real one does, so the parents' wiring is what runs.
 */
vi.mock('@/components/ContactComposeDialog', () => ({
  default: ({
    open,
    mode,
    lead,
    onClose,
    onResult,
  }: Readonly<{
    open: boolean;
    mode: string;
    lead: { display_name: string; primary_email?: string | null } | null;
    onClose: () => void;
    onResult: (message: string, ok: boolean) => void;
  }>) =>
    open ? (
      <section aria-label="compose">
        <p>{`${mode} · ${lead?.display_name}`}</p>
        <button type="button" onClick={() => onResult(`Sent to ${lead?.primary_email}`, true)}>
          Report sent
        </button>
        <button type="button" onClick={onClose}>
          Dismiss
        </button>
      </section>
    ) : null,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LeadContactActions', () => {
  const renderActions = () =>
    renderWithApollo(
      <LeadContactActions entity="VENUE_LEAD" leadId="venue-1" displayName="Grand Hall" email="meera@grandhall.in" mobile="9812345678" />,
    );

  it('opens the call options menu and closes it with Escape', async () => {
    renderActions();

    fireEvent.click(screen.getByTestId('lead-call-options'));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Call' })).toBeInTheDocument();

    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('closes the menu when focus tabs away or the page is clicked', async () => {
    renderActions();

    fireEvent.click(screen.getByTestId('lead-call-options'));
    fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Tab' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    fireEvent.click(screen.getByTestId('lead-call-options'));
    fireEvent.keyDown(await screen.findByRole('menu'), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    // MUI arms its click-away listener a tick after the menu opens.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
    });
    fireEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('starts a portal call from the menu', async () => {
    renderActions();

    fireEvent.click(screen.getByTestId('lead-call-options'));
    fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Call' }));

    expect(await screen.findByRole('dialog', { name: /Call · Grand Hall/ })).toBeInTheDocument();
  });

  it('starts an AI call from the menu', async () => {
    renderActions();

    fireEvent.click(screen.getByTestId('lead-call-options'));
    fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'AI Call' }));

    expect(await screen.findByRole('dialog', { name: /AI Call · Grand Hall/ })).toBeInTheDocument();
  });

  it('opens the email window and toasts its result', async () => {
    renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(screen.getByText('email · Grand Hall')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Report sent' }));
    expect(await screen.findByText('Sent to meera@grandhall.in')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByLabelText('compose')).toBeNull();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Sent to meera@grandhall.in')).toBeNull());
  });
});

describe('ContactsTab', () => {
  const contacts: CrmContact[] = [
    { name: '', role: '', mobile_number: '9812345678', whatsapp_number: '', email: 'frontdesk@grandhall.in' },
    { name: '', role: 'Manager', mobile_number: '', whatsapp_number: '', email: 'events@grandhall.in' },
  ];

  it('labels unnamed contacts by position and emails them on behalf of the lead', async () => {
    renderWithApollo(<ContactsTab entity="VENUE_LEAD" leadId="venue-1" leadName="Grand Hall" contacts={contacts} />);

    expect(screen.getByText('Primary contact')).toBeInTheDocument();
    expect(screen.getByText('Contact 2')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /email contact/i })[1]);
    expect(screen.getByText('email · Grand Hall')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Report sent' }));
    expect(await screen.findByText('Sent to events@grandhall.in')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByLabelText('compose')).toBeNull();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Sent to events@grandhall.in')).toBeNull());
  });
});
