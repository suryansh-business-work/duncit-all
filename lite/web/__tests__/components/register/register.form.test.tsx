import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { RegisterForm } from '../../../components/register';
import { LITE_REGISTER, type LiteRegisterInput } from '../../../graphql/registrations';
import { eventFixture, meFixture, questionFixture, registrationFixture, renderWithProviders, settle, ticketFixture } from '../../test-utils';

const QUESTIONS = [
  questionFixture({ id: 'q-1', label: 'Dietary needs', type: 'TEXT', required: true }),
  questionFixture({ id: 'q-2', label: 'Anything else?', type: 'LONG_TEXT', required: false }),
  questionFixture({ id: 'q-3', label: 'Bringing a dog', type: 'CHECKBOX', required: false }),
  questionFixture({ id: 'q-4', label: 'T-shirt size', type: 'SELECT', required: true, options: ['S', 'M', 'L'] }),
  questionFixture({ id: 'q-5', label: 'Meal', type: 'SELECT', required: false, options: ['Veg', 'Non-veg'] }),
];

const registerMock = (input: LiteRegisterInput, result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_REGISTER, variables: { event_id: 'ev-1', input } },
  result,
});
const confirmed = () => ({ data: { liteRegister: registrationFixture() } });

const renderForm = (event: LiteEvent, mocks: MockedResponse[] = []) => {
  const onDone = vi.fn();
  const utils = renderWithProviders(<RegisterForm event={event} onDone={onDone} />, { me: meFixture(), mocks });
  return { ...utils, onDone };
};

describe('RegisterForm — the ticket step', () => {
  it('offers each ticket on sale, preselects the first with seats left and greys out a sold-out one', () => {
    renderForm(
      eventFixture({
        tickets: [
          ticketFixture({ id: 'tk-full', name: 'Early bird', quantity: 10, sold: 10 }),
          ticketFixture({ id: 'tk-1', name: 'General' }),
          ticketFixture({ id: 'tk-old', name: 'Retired', is_active: false }),
        ],
      }),
    );

    const group = screen.getByRole('group', { name: 'Ticket' });
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    const soldOut = within(group).getByRole('radio', { name: /Early bird/ });
    expect(soldOut).toBeDisabled();
    expect(soldOut).not.toBeChecked();
    expect(within(group).getByText('Sold out')).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /General/ })).toBeChecked();
    expect(screen.queryByText('Retired')).not.toBeInTheDocument();
  });

  it('registers straight away for one seat when the host asked no questions', async () => {
    const answer = vi.fn(confirmed);
    const { user, onDone } = renderForm(eventFixture(), [registerMock({ ticket_id: 'tk-1', quantity: 1, answers: [] }, answer)]);

    expect(screen.queryByTestId('register-next')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ id: 'reg-1', status: 'CONFIRMED' }));
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it('sends the ticket and the number of seats the guest chose', async () => {
    const answer = vi.fn(confirmed);
    const event = eventFixture({ tickets: [ticketFixture(), ticketFixture({ id: 'tk-vip', name: 'VIP', price: 900 })] });
    const { user, onDone } = renderForm(event, [registerMock({ ticket_id: 'tk-vip', quantity: 3, answers: [] }, answer)]);

    await user.click(screen.getByRole('radio', { name: /VIP/ }));
    await user.click(screen.getByTestId('register-quantity'));
    const options = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    await user.click(screen.getByRole('option', { name: '3' }));
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it('asks for a ticket when every one is sold out, without calling the API', async () => {
    const answer = vi.fn(confirmed);
    const { user, onDone } = renderForm(eventFixture({ tickets: [ticketFixture({ quantity: 5, sold: 5 })] }), [
      registerMock({ ticket_id: '', quantity: 1, answers: [] }, answer),
    ]);

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Pick a ticket type')).toBeInTheDocument();
    expect(answer).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('words the button as a request and explains approval when the host approves guests', () => {
    renderForm(eventFixture({ require_approval: true }));

    expect(screen.getByRole('button', { name: 'Send request' })).toBeInTheDocument();
    expect(screen.getByText('The host approves each request before a seat is held.')).toBeInTheDocument();
  });

  it('shows the API refusal in the form and does not finish', async () => {
    const { user, onDone } = renderForm(eventFixture(), [registerMock({ ticket_id: 'tk-1', quantity: 1, answers: [] }, { errors: [{ message: 'That ticket just sold out' }] })]);

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That ticket just sold out');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('falls back to its own words when the failure says nothing', async () => {
    const { user } = renderForm(eventFixture(), [{ request: { query: LITE_REGISTER, variables: { event_id: 'ev-1', input: { ticket_id: 'tk-1', quantity: 1, answers: [] } } }, error: new Error('') }]);

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Registration did not go through. Please try again.');
  });
});

describe('RegisterForm — the questions step', () => {
  const event = eventFixture({ questions: QUESTIONS });

  it('moves to the host’s questions with Next, and back again with the ticket still chosen', async () => {
    const { user } = renderForm(event);
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('A few questions from the host')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Dietary needs *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Anything else?' }).tagName).toBe('TEXTAREA');
    expect(screen.getByRole('checkbox', { name: 'Bringing a dog' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('radio', { name: /General/ })).toBeChecked();
    expect(screen.queryByText('A few questions from the host')).not.toBeInTheDocument();
  });

  it('will not move on without a ticket', async () => {
    const { user } = renderForm(eventFixture({ questions: QUESTIONS, tickets: [ticketFixture({ quantity: 1, sold: 1 })] }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Pick a ticket type')).toBeInTheDocument();
    expect(screen.queryByText('A few questions from the host')).not.toBeInTheDocument();
  });

  it('offers "No answer" only on an optional choice question', async () => {
    const { user } = renderForm(event);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(await screen.findByTestId('question-q-4'));
    const required = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(required.map((option) => option.textContent)).toEqual(['S', 'M', 'L']);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('question-q-5'));
    const optional = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(optional.map((option) => option.textContent)).toEqual(['No answer', 'Veg', 'Non-veg']);
  });

  it('marks required questions and refuses to send while they are blank', async () => {
    // No API answer is mocked: a request would fail and show an error alert.
    const { user, onDone } = renderForm(event);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('A few questions from the host');
    expect(screen.getAllByText('Required')).toHaveLength(2);
    expect(screen.getAllByText('Optional')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findAllByText('This is required')).toHaveLength(2);
    await settle();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('sends every answer, in the host’s order, a ticked box as "Yes"', async () => {
    const answer = vi.fn(confirmed);
    const { user, onDone } = renderForm(event, [
      registerMock(
        {
          ticket_id: 'tk-1',
          quantity: 1,
          answers: [
            { question_id: 'q-1', answer: 'Vegan' },
            { question_id: 'q-2', answer: 'Window seat' },
            { question_id: 'q-3', answer: 'Yes' },
            { question_id: 'q-4', answer: 'M' },
            { question_id: 'q-5', answer: '' },
          ],
        },
        answer,
      ),
    ]);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(await screen.findByRole('textbox', { name: 'Dietary needs *' }), '  Vegan ');
    await user.type(screen.getByRole('textbox', { name: 'Anything else?' }), 'Window seat');
    await user.click(screen.getByRole('checkbox', { name: 'Bringing a dog' }));
    await user.click(screen.getByTestId('question-q-4'));
    await user.click(await screen.findByRole('option', { name: 'M' }));
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it('clears a ticked box back to no answer', async () => {
    const { user } = renderForm(event);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const box = await screen.findByRole('checkbox', { name: 'Bringing a dog' });

    await user.click(box);
    expect(box).toBeChecked();
    await user.click(box);
    expect(box).not.toBeChecked();
  });
});
