import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { useSignInPrompt } from '../../../app/providers/SignInPromptProvider';
import { RegistrationCard } from '../../../pages/event/RegistrationCard';
import { eventFixture, meFixture, registrationFixture, renderWithProviders, ticketFixture } from '../../test-utils';

const DAY_MS = 86_400_000;

/** An event a week out (or a week gone), so the card's clock never decides the case by accident. */
const future = (over: Partial<LiteEvent> = {}): LiteEvent =>
  eventFixture({ start_at: new Date(Date.now() + 7 * DAY_MS).toISOString(), end_at: new Date(Date.now() + 7 * DAY_MS + 3_600_000).toISOString(), ...over });
const past = (over: Partial<LiteEvent> = {}): LiteEvent =>
  eventFixture({ start_at: new Date(Date.now() - 7 * DAY_MS).toISOString(), end_at: new Date(Date.now() - 7 * DAY_MS + 3_600_000).toISOString(), ...over });

/** Shows whether the app-wide sign-in dialog was asked for. */
function SignInProbe() {
  const { dialogOpen } = useSignInPrompt();
  return <output data-testid="sign-in-requested">{String(dialogOpen)}</output>;
}

const renderCard = (event: LiteEvent, signedIn = false) =>
  renderWithProviders(
    <>
      <RegistrationCard event={event} onChanged={vi.fn()} />
      <SignInProbe />
    </>,
    { me: signedIn ? meFixture() : null },
  );

describe('RegistrationCard', () => {
  it('lists the tickets on sale under a Tickets heading', () => {
    renderCard(future({ tickets: [ticketFixture({ name: 'Early bird', price: 500 }), ticketFixture({ id: 'tk-2', name: 'Hidden', is_active: false })] }));

    const card = screen.getByTestId('registration-card');
    expect(within(card).getByRole('heading', { name: 'Tickets' })).toBeInTheDocument();
    expect(within(card).getByText('Early bird')).toBeInTheDocument();
    expect(within(card).queryByText('Hidden')).not.toBeInTheDocument();
  });

  it.each([
    ['a cancelled event', future({ status: 'CANCELLED' }), 'This event was cancelled.', 'MuiAlert-colorInfo'],
    ['a draft', future({ status: 'DRAFT' }), 'This event is not published yet. Only you can see it.', 'MuiAlert-colorWarning'],
    ['an event that has ended', past(), 'This event has ended.', 'MuiAlert-colorInfo'],
    ['an event whose host closed registration', future({ registration_open: false }), 'The host has closed registration for this event.', 'MuiAlert-colorInfo'],
  ])('explains why %s cannot be registered for, with no register button', (_case, event, message, severityClass) => {
    renderCard(event);

    const closed = screen.getByTestId('registration-closed');
    expect(closed).toHaveTextContent(message);
    expect(closed).toHaveClass(severityClass);
    expect(screen.queryByTestId('register-open')).not.toBeInTheDocument();
  });

  it('offers Register on an open event', () => {
    renderCard(future());
    expect(screen.getByTestId('register-open')).toHaveTextContent('Register');
    expect(screen.queryByText('The host approves each request before a seat is held.')).not.toBeInTheDocument();
  });

  it('offers "Request to join" and explains approval when the host approves each guest', () => {
    renderCard(future({ require_approval: true }));
    expect(screen.getByTestId('register-open')).toHaveTextContent('Request to join');
    expect(screen.getByText('The host approves each request before a seat is held.')).toBeInTheDocument();
  });

  it('asks a signed-out reader to sign in instead of opening the registration form', async () => {
    const { user } = renderCard(future());
    expect(screen.getByTestId('sign-in-requested')).toHaveTextContent('false');

    await user.click(screen.getByTestId('register-open'));

    expect(screen.getByTestId('sign-in-requested')).toHaveTextContent('true');
    expect(screen.queryByTestId('register-dialog')).not.toBeInTheDocument();
  });

  it('opens the registration form for a signed-in reader, and closes it again', async () => {
    const { user } = renderCard(future(), true);

    await user.click(screen.getByTestId('register-open'));

    const dialog = await screen.findByRole('dialog', { name: 'Register' });
    expect(within(dialog).getByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-requested')).toHaveTextContent('false');

    await user.click(within(dialog).getByTestId('register-dialog-close'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Register' })).not.toBeInTheDocument());
  });

  it('shows the viewer their own place instead of a register button', () => {
    renderCard(future({ viewer_registration: registrationFixture({ status: 'WAITLISTED', waitlist_position: 2 }) }), true);

    const status = screen.getByTestId('viewer-status');
    expect(status).toHaveTextContent('You are on the waitlist. We will tell you when a spot opens.');
    expect(status).toHaveTextContent('Position 2');
    expect(screen.queryByTestId('register-open')).not.toBeInTheDocument();
    expect(screen.queryByTestId('registration-closed')).not.toBeInTheDocument();
  });

  it('shows nothing to act on for a declined registration once the event is past', () => {
    renderCard(past({ viewer_registration: registrationFixture({ status: 'DECLINED' }) }), true);
    expect(screen.getByTestId('registration-closed')).toHaveTextContent('This event has ended.');
    expect(screen.queryByTestId('viewer-status')).not.toBeInTheDocument();
  });
});
