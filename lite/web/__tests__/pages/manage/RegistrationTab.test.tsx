import type { MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LITE_SET_REGISTRATION_OPEN } from '../../../graphql/events';
import { RegistrationTab } from '../../../pages/manage/RegistrationTab';
import { captureNotifications, questionFixture, renderWithProviders, ticketFixture } from '../../test-utils';
import { apiRefusal, hostedEvent } from './manage-mocks';

const toggleMock = (open: boolean, result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_SET_REGISTRATION_OPEN, variables: { id: 'ev-1', open } }, result });

describe('RegistrationTab', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('shows registration as open with a switch that is on', () => {
    renderWithProviders(<RegistrationTab event={hostedEvent()} onChanged={vi.fn()} />);

    expect(screen.getByTestId('registration-open')).toBeChecked();
    expect(screen.getByText('Registration is open')).toBeInTheDocument();
    expect(screen.getByText('Closing it keeps the event page up but hides the register button.')).toBeInTheDocument();
  });

  it('closes registration, says so and tells the page to reload', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<RegistrationTab event={hostedEvent()} onChanged={onChanged} />, {
      mocks: [toggleMock(false, { data: { liteSetRegistrationOpen: hostedEvent({ registration_open: false }) } })],
    });

    await user.click(screen.getByTestId('registration-open'));

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([{ message: 'Registration is closed.', severity: 'success' }]);
  });

  it('opens a closed registration again', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<RegistrationTab event={hostedEvent({ registration_open: false })} onChanged={onChanged} />, {
      mocks: [toggleMock(true, { data: { liteSetRegistrationOpen: hostedEvent({ registration_open: true }) } })],
    });

    expect(screen.getByText('Registration is closed')).toBeInTheDocument();
    expect(screen.getByTestId('registration-open')).not.toBeChecked();

    await user.click(screen.getByTestId('registration-open'));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Registration is open again.', severity: 'success' }]));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('shows the refusal and does not reload when the switch fails', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<RegistrationTab event={hostedEvent()} onChanged={onChanged} />, { mocks: [toggleMock(false, apiRefusal('Only hosts can change registration'))] });

    await user.click(screen.getByTestId('registration-open'));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Only hosts can change registration', severity: 'error' }]));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('lists the limits: unlimited capacity and no approval by default', () => {
    renderWithProviders(<RegistrationTab event={hostedEvent()} onChanged={vi.fn()} />);

    expect(screen.getByText('Capacity').nextSibling).toHaveTextContent('Unlimited');
    expect(screen.getByText('Require approval').nextSibling).toHaveTextContent('No');
  });

  it('shows a set capacity and approval when the host asked for them', () => {
    renderWithProviders(<RegistrationTab event={hostedEvent({ capacity: 40, require_approval: true })} onChanged={vi.fn()} />);

    expect(screen.getByText('Capacity').nextSibling).toHaveTextContent('40');
    expect(screen.getByText('Require approval').nextSibling).toHaveTextContent('Yes');
  });

  it('lists each ticket with its price and how many are taken', () => {
    const event = hostedEvent({
      tickets: [ticketFixture({ sold: 3 }), ticketFixture({ id: 'tk-2', name: 'VIP', price: 1250, quantity: 20, sold: 5 })],
    });
    renderWithProviders(<RegistrationTab event={event} onChanged={vi.fn()} />);

    const [free, vip] = screen.getAllByTestId('registration-ticket');
    expect(free).toHaveTextContent('General');
    expect(free).toHaveTextContent('Free');
    expect(free).toHaveTextContent('3 of Unlimited taken');
    expect(vip).toHaveTextContent('VIP');
    expect(vip).toHaveTextContent('₹1,250');
    expect(vip).toHaveTextContent('5 of 20 taken');
  });

  it('says when there are no registration questions', () => {
    renderWithProviders(<RegistrationTab event={hostedEvent()} onChanged={vi.fn()} />);

    expect(screen.getByText('No questions yet.')).toBeInTheDocument();
  });

  it('lists each question with its answer type', () => {
    const event = hostedEvent({ questions: [questionFixture(), questionFixture({ id: 'q-2', label: 'T-shirt size', type: 'SELECT', options: ['S', 'M'] })] });
    renderWithProviders(<RegistrationTab event={event} onChanged={vi.fn()} />);

    expect(screen.getByText('Dietary needs').nextSibling).toHaveTextContent('Short text');
    expect(screen.getByText('T-shirt size').nextSibling).toHaveTextContent('Pick one');
    expect(screen.queryByText('No questions yet.')).not.toBeInTheDocument();
  });

  it('links a live event to its editor', () => {
    renderWithProviders(<RegistrationTab event={hostedEvent()} onChanged={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Edit tickets and questions' })).toHaveAttribute('href', '/e/garden-party/edit');
  });

  it('locks the switch and hides the editor link for a cancelled event', () => {
    renderWithProviders(<RegistrationTab event={hostedEvent({ status: 'CANCELLED' })} onChanged={vi.fn()} />);

    expect(screen.getByTestId('registration-open')).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Edit tickets and questions' })).not.toBeInTheDocument();
  });
});
