// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VenueKitInterestForm, venueKitCodeSchema, venueKitInterestSchema, type VenueKitOtpActions, type VenueKitOtpState } from '.';

// The schemas take the surface's translator; echoing keys keeps the messages assertable.
const echo = ((key: string) => key) as Parameters<typeof venueKitInterestSchema>[0];
const schema = venueKitInterestSchema(echo);
const codeSchema = venueKitCodeSchema(echo);
const valid = { name: 'Cafe Owner', email: 'owner@cafe.in', phone_number: '9876543210', email_code: '', phone_code: '', verify_phone: false };
const messagesOf = (values: Partial<typeof valid>) => {
  const result = schema.safeParse({ ...valid, ...values });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

afterEach(cleanup);

describe('venueKitInterestSchema', () => {
  it('trims the name, lower-cases the address and keeps only the digits of the number', () => {
    const result = schema.parse({ ...valid, name: '  Cafe Owner ', email: ' Owner@Cafe.IN ', phone_number: '98765 43210' });
    expect(result).toMatchObject({ name: 'Cafe Owner', email: 'owner@cafe.in', phone_number: '9876543210' });
  });

  it('asks for a name of at least two letters and at most eighty', () => {
    expect(messagesOf({ name: ' A ' })).toEqual(['venueKit.form.nameRequired']);
    expect(messagesOf({ name: 'x'.repeat(81) })).toEqual(['venueKit.form.nameRequired']);
  });

  it.each(['owner', 'owner@', '@cafe.in', 'own er@cafe.in'])('refuses the address "%s"', (email) => {
    expect(messagesOf({ email })).toEqual(['venueKit.form.emailInvalid']);
  });

  it.each(['5876543210', '98765', '98765432101', ''])('refuses "%s" as an Indian mobile', (phone_number) => {
    expect(messagesOf({ phone_number })).toEqual(['venueKit.form.phoneInvalid']);
  });
});

describe('venueKitCodeSchema', () => {
  it('takes six digits whatever spaces surround them, and nothing else', () => {
    expect(codeSchema.parse(' 123 456 ')).toBe('123456');
    expect(codeSchema.safeParse('12345').success).toBe(false);
    expect(codeSchema.safeParse('').success).toBe(false);
  });
});

const IDLE: VenueKitOtpState = { emailNote: null, emailToken: null, phoneNote: null, phoneToken: null, busy: null };

/** Renders the idle form, types the details when asked, then moves it to `state`. */
function setup(state: Partial<VenueKitOtpState> = {}, opts: { fill?: boolean; submitOk?: boolean } = {}) {
  const actions: VenueKitOtpActions = {
    sendEmail: vi.fn().mockResolvedValue(true),
    verifyEmail: vi.fn().mockResolvedValue(true),
    sendPhone: vi.fn().mockResolvedValue(true),
    verifyPhone: vi.fn().mockResolvedValue(true),
    submit: vi.fn().mockResolvedValue(opts.submitOk ?? true),
    reset: vi.fn(),
  };
  const view = render(<VenueKitInterestForm state={IDLE} actions={actions} />);
  const rerender = (next: Partial<VenueKitOtpState>) => view.rerender(<VenueKitInterestForm state={{ ...IDLE, ...next }} actions={actions} />);
  if (opts.fill) fillDetails();
  rerender(state);
  return { actions, rerender };
}

const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const press = (testId: string) => fireEvent.click(screen.getByTestId(testId));

function fillDetails() {
  type('venue-kit-name', ' Cafe Owner ');
  type('venue-kit-email', 'Owner@Cafe.in');
  type('venue-kit-phone_number', '98765 43210');
}

describe('VenueKitInterestForm', () => {
  it('sends the email code for the trimmed, lower-cased address', async () => {
    const { actions } = setup();
    fillDetails();
    press('venue-kit-send-email');
    await waitFor(() => expect(actions.sendEmail).toHaveBeenCalledWith('Cafe Owner', 'owner@cafe.in'));
  });

  it('says what is wrong with the details and sends nothing', async () => {
    const { actions } = setup();
    type('venue-kit-email', 'nope');
    press('venue-kit-send-email');
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(screen.getByText('Enter your name')).toBeTruthy();
    expect(actions.sendEmail).not.toHaveBeenCalled();
  });

  it('keeps the submit off until the email is proved', () => {
    setup();
    expect((screen.getByTestId('venue-kit-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('checks the email code before asking the server, then verifies it', async () => {
    const { actions } = setup({ emailNote: 'We sent a code to owner@cafe.in' }, { fill: true });
    expect(screen.getByText('We sent a code to owner@cafe.in')).toBeTruthy();
    type('venue-kit-email-code-input', '12a');
    press('venue-kit-email-code-verify');
    expect(await screen.findByText('Enter the 6-digit code')).toBeTruthy();
    expect(actions.verifyEmail).not.toHaveBeenCalled();
    type('venue-kit-email-code-input', '123456');
    press('venue-kit-email-code-verify');
    await waitFor(() => expect(actions.verifyEmail).toHaveBeenCalledWith('owner@cafe.in', '123456'));
  });

  it('resends the email code from the code step', async () => {
    const { actions } = setup({ emailNote: 'sent' }, { fill: true });
    press('venue-kit-email-code-resend');
    await waitFor(() => expect(actions.sendEmail).toHaveBeenCalledTimes(1));
  });

  it('change email drops the proofs and clears the codes', () => {
    const { actions } = setup({ emailNote: 'sent' });
    press('venue-kit-change-email');
    expect(actions.reset).toHaveBeenCalledTimes(1);
  });

  it('offers the SMS step only when ticked, and texts the cleaned +91 number', async () => {
    const { actions } = setup({ emailToken: 'email-proof' }, { fill: true });
    expect(screen.getByText('Email verified')).toBeTruthy();
    expect(screen.queryByTestId('venue-kit-send-phone')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox'));
    press('venue-kit-send-phone');
    await waitFor(() => expect(actions.sendPhone).toHaveBeenCalledWith('9876543210'));
  });

  it('refuses to text a number that is not an Indian mobile', async () => {
    const { actions } = setup({ emailToken: 'email-proof' }, { fill: true });
    type('venue-kit-phone_number', '5876543210');
    fireEvent.click(screen.getByRole('checkbox'));
    press('venue-kit-send-phone');
    expect(await screen.findByText('Enter a valid 10-digit Indian mobile number')).toBeTruthy();
    expect(actions.sendPhone).not.toHaveBeenCalled();
  });

  it('verifies the SMS code for the number it was sent to', async () => {
    const { actions, rerender } = setup({ emailToken: 'email-proof' }, { fill: true });
    fireEvent.click(screen.getByRole('checkbox'));
    rerender({ emailToken: 'email-proof', phoneNote: 'We texted +91 9876543210' });
    type('venue-kit-phone-code-input', '1');
    press('venue-kit-phone-code-verify');
    expect(await screen.findByText('Enter the 6-digit code')).toBeTruthy();
    type('venue-kit-phone-code-input', '654321');
    press('venue-kit-phone-code-verify');
    await waitFor(() => expect(actions.verifyPhone).toHaveBeenCalledWith('9876543210', '654321'));
    press('venue-kit-phone-code-resend');
    await waitFor(() => expect(actions.sendPhone).toHaveBeenCalledTimes(1));
  });

  it('shows a proved mobile as verified', () => {
    setup({ emailToken: 'email-proof', phoneToken: 'phone-proof' });
    expect(screen.getByText('Mobile verified')).toBeTruthy();
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('submits the name and cleaned number, then empties the form', async () => {
    const { actions } = setup({ emailToken: 'email-proof' }, { fill: true });
    press('venue-kit-submit');
    await waitFor(() => expect(actions.submit).toHaveBeenCalledWith({ name: 'Cafe Owner', phone_number: '9876543210' }));
    await waitFor(() => expect((screen.getByTestId('venue-kit-name') as HTMLInputElement).value).toBe(''));
  });

  it('keeps what was typed when the submit fails', async () => {
    const { actions } = setup({ emailToken: 'email-proof' }, { fill: true, submitOk: false });
    press('venue-kit-submit');
    await waitFor(() => expect(actions.submit).toHaveBeenCalledTimes(1));
    expect((screen.getByTestId('venue-kit-name') as HTMLInputElement).value).toBe(' Cafe Owner ');
  });
});
