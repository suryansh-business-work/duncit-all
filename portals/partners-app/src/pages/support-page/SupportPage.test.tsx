import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import SupportPage from './SupportPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const account = (over: Record<string, unknown> = {}) => ({
  me: { __typename: 'User', full_name: 'Asha Rao', first_name: 'Asha', last_name: 'Rao', email: 'asha@duncit.com', ...over },
});

const submitted = (over: Record<string, unknown> = {}) => ({
  submitContactForm: { __typename: 'ContactResult', ok: true, message: 'We have your request.', ...over },
});

const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<SupportPage />, {
    link: scriptedLink({ PartnerSupportPage: account(), PartnerSubmitSupport: submitted(), ...answers }, sent),
  });

const fill = async (subject = 'Venue request stuck', message = 'My venue request has been waiting for days.') => {
  fireEvent.change(await screen.findByLabelText(/Subject/), { target: { value: subject } });
  fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: message } });
};
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send to support' }));

describe('SupportPage', () => {
  it('prefills the signed-in partner’s name and locks their account email', async () => {
    mount();
    expect(((await screen.findByLabelText(/Your name/)) as HTMLInputElement).value).toBe('Asha Rao');
    const email = screen.getByLabelText(/Email/) as HTMLInputElement;
    expect(email.value).toBe('asha@duncit.com');
    expect(email.disabled).toBe(true);
  });

  it('builds the name from first and last name when the account has no full name', async () => {
    mount({ PartnerSupportPage: account({ full_name: '', first_name: 'Asha', last_name: 'Rao' }) });
    expect(((await screen.findByLabelText(/Your name/)) as HTMLInputElement).value).toBe('Asha Rao');
  });

  it('opens a blank form when the account read returns no account', async () => {
    mount({ PartnerSupportPage: { me: null } });
    expect(((await screen.findByLabelText(/Your name/)) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe('');
  });

  it('shows a spinner instead of the form while the account loads', async () => {
    mount({ PartnerSupportPage: STAY_PENDING });
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send to support' })).toBeNull();
  });

  it('sends the request under its category and confirms with the server’s message', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    await fill();
    send();
    expect(await screen.findByText('We have your request.')).toBeTruthy();
    expect(sent.find((op) => op.name === 'PartnerSubmitSupport')?.variables).toEqual({
      input: {
        name: 'Asha Rao',
        email: 'asha@duncit.com',
        subject: '[HOST] Venue request stuck',
        message: 'My venue request has been waiting for days.',
      },
    });
  });

  it('confirms in its own words when the server sends no message', async () => {
    mount({ PartnerSubmitSupport: submitted({ message: '' }) });
    await fill();
    send();
    expect(await screen.findByText('Support request submitted.')).toBeTruthy();
  });

  it('dismisses the confirmation', async () => {
    mount();
    await fill();
    send();
    const alert = (await screen.findByText('We have your request.')).closest('[role="alert"]') as HTMLElement;
    fireEvent.click(alert.querySelector('button') as HTMLElement);
    await waitFor(() => expect(screen.queryByText('We have your request.')).toBeNull());
  });

  it('shows the server’s refusal and confirms nothing', async () => {
    mount({ PartnerSubmitSupport: submitted({ ok: false, message: 'Too many requests today' }) });
    await fill();
    send();
    expect(await screen.findByText('Too many requests today')).toBeTruthy();
    expect(screen.queryByText('Support request submitted.')).toBeNull();
  });

  it('says the request could not be submitted when the refusal carries no message', async () => {
    mount({ PartnerSubmitSupport: submitted({ ok: false, message: '' }) });
    await fill();
    send();
    expect(await screen.findByText('Could not submit support request.')).toBeTruthy();
  });

  it('shows a failed request’s message and re-enables sending', async () => {
    mount({ PartnerSubmitSupport: new Error('Network down') });
    await fill();
    send();
    expect(await screen.findByText('Network down')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send to support' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not send a request with a subject or message that is too short, and says why', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    await fill('Hi', 'short');
    send();
    await waitFor(() => expect(screen.getAllByText(/at least|characters/i).length).toBeGreaterThan(0));
    expect(sent.some((op) => op.name === 'PartnerSubmitSupport')).toBe(false);
  });
});
