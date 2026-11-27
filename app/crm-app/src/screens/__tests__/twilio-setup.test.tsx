import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/twilio';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ApiError } from '@/utils/errors';
import { TwilioSetupScreen } from '../settings/TwilioSetupScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Settings › Twilio: unlock with the emailed code, then edit, save and test the TWILIO entry. */

const request = gqlRequest as jest.Mock;
const WAIT = { timeout: 3000 };

const ENTRY = {
  id: 'e1',
  name: 'Twilio',
  is_default: true,
  is_active: true,
  config: [
    { key: 'account_sid', value: 'AC123' },
    { key: 'auth_token', value: 'stored-token' },
    { key: 'phone_number', value: '+14155552671' },
  ],
  secrets: [{ key: 'has_auth_token', present: true }],
  last_test_ok: null,
};

type Handler = (vars: Record<string, unknown>) => unknown;

function serve(handlers: Map<unknown, Handler>) {
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = handlers.get(doc);
    if (!handler) throw new Error('unexpected request');
    return handler(vars);
  });
}

const calls = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const status = (unlocked: boolean) => ({
  envAccessStatus: { unlocked, expires_at: null, sent_to: 'r***@duncit.com' },
});

beforeEach(() => jest.clearAllMocks());

describe('TwilioSetupScreen', () => {
  it('asks for the root admin’s code first, then opens the settings once it is right', async () => {
    let unlocked = false;
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEnvAccessStatusDocument, () => status(unlocked)],
        [
          docs.CrmAppRequestEnvAccessCodeDocument,
          () => ({
            requestEnvAccessCode: {
              challenge_id: 'ch1',
              expires_at: '2026-11-27T12:00:00.000Z',
              resend_after_seconds: 30,
              sent_to: 'r***@duncit.com',
            },
          }),
        ],
        [
          docs.CrmAppVerifyEnvAccessCodeDocument,
          (vars) => {
            if (vars.code !== '123456') throw new ApiError('That code is wrong');
            unlocked = true;
            return status(true);
          },
        ],
        [docs.CrmAppTwilioEntriesDocument, () => ({ envEntries: [ENTRY] })],
      ]),
    );
    renderWithTheme(<TwilioSetupScreen />);
    expect(await screen.findByTestId('twilio-unlock', {}, WAIT)).toBeOnTheScreen();
    // No entry is read while locked.
    expect(calls(docs.CrmAppTwilioEntriesDocument)).toHaveLength(0);
    expect(screen.queryByTestId('env-access-code')).toBeNull();

    await act(async () => fireEvent.press(screen.getByTestId('env-access-send')));
    expect(screen.getByTestId('env-access-sent')).toHaveTextContent(
      'A code was sent to r***@duncit.com.',
    );

    // Not six digits: refused before it is sent.
    fireEvent.changeText(screen.getByTestId('env-access-code'), '12');
    await act(async () => fireEvent.press(screen.getByTestId('env-access-unlock')));
    expect(screen.getByText('Enter the 6-digit code.')).toBeOnTheScreen();
    expect(calls(docs.CrmAppVerifyEnvAccessCodeDocument)).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('env-access-code'), '999999');
    await act(async () => fireEvent.press(screen.getByTestId('env-access-unlock')));
    expect(await screen.findByTestId('env-access-error')).toHaveTextContent('That code is wrong');

    fireEvent.changeText(screen.getByTestId('env-access-code'), '123456');
    await act(async () => fireEvent.press(screen.getByTestId('env-access-unlock')));
    expect(calls(docs.CrmAppVerifyEnvAccessCodeDocument).at(-1)?.[1]).toEqual({
      challengeId: 'ch1',
      code: '123456',
    });
    expect(await screen.findByTestId('twilio-account-sid', {}, WAIT)).toBeOnTheScreen();
  });

  it('edits the saved entry: the token stays write-only, a blank one keeps it, then tests it', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEnvAccessStatusDocument, () => status(true)],
        [docs.CrmAppTwilioEntriesDocument, () => ({ envEntries: [ENTRY] })],
        [docs.CrmAppUpdateTwilioEntryDocument, () => ({ updateEnvEntry: { id: 'e1' } })],
        [
          docs.CrmAppTestTwilioEntryDocument,
          () => ({ testEnvEntry: { ok: false, message: 'Twilio says the token is wrong' } }),
        ],
      ]),
    );
    renderWithTheme(<TwilioSetupScreen />);
    const sid = await screen.findByTestId('twilio-account-sid', {}, WAIT);
    expect(sid.props.value).toBe('AC123');
    // The stored token is never shown.
    expect(screen.getByTestId('twilio-auth-token').props.value).toBe('');
    expect(screen.getByText('A token is saved. Leave this blank to keep it.')).toBeOnTheScreen();

    // A number without + and country code is refused before saving.
    fireEvent.changeText(screen.getByTestId('twilio-agent-number'), '9811000001');
    await act(async () => fireEvent.press(screen.getByTestId('twilio-save')));
    expect(
      screen.getByText('Enter the number as + and country code, e.g. +14155552671.'),
    ).toBeOnTheScreen();
    expect(calls(docs.CrmAppUpdateTwilioEntryDocument)).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('twilio-agent-number'), '+919811000001');
    await act(async () => fireEvent.press(screen.getByTestId('twilio-save')));
    expect(calls(docs.CrmAppUpdateTwilioEntryDocument)[0]?.[1]).toEqual({
      id: 'e1',
      input: {
        config: [
          { key: 'account_sid', value: 'AC123' },
          { key: 'phone_number', value: '+14155552671' },
          { key: 'agent_phone_number', value: '+919811000001' },
        ],
      },
    });
    expect(await screen.findByTestId('twilio-result')).toHaveTextContent('Twilio settings saved.');

    await act(async () => fireEvent.press(screen.getByTestId('twilio-test')));
    expect(calls(docs.CrmAppTestTwilioEntryDocument)[0]?.[1]).toEqual({ id: 'e1' });
    expect(screen.getByTestId('twilio-result')).toHaveTextContent('Twilio says the token is wrong');
  });

  it('creates the default entry when there is none, and the token is then required', async () => {
    let created = false;
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEnvAccessStatusDocument, () => status(true)],
        [
          docs.CrmAppTwilioEntriesDocument,
          () => ({ envEntries: created ? [{ ...ENTRY, id: 'new1' }] : [] }),
        ],
        [
          docs.CrmAppCreateTwilioEntryDocument,
          () => {
            created = true;
            return { createEnvEntry: { id: 'new1' } };
          },
        ],
      ]),
    );
    renderWithTheme(<TwilioSetupScreen />);
    await screen.findByTestId('twilio-account-sid', {}, WAIT);
    // Nothing saved yet, so there is nothing to test.
    expect(screen.queryByTestId('twilio-test')).toBeNull();
    fireEvent.changeText(screen.getByTestId('twilio-account-sid'), 'AC999');
    fireEvent.changeText(screen.getByTestId('twilio-phone-number'), '+14155552671');
    await act(async () => fireEvent.press(screen.getByTestId('twilio-save')));
    expect(screen.getAllByText('This is required.').length).toBeGreaterThan(0);
    expect(calls(docs.CrmAppCreateTwilioEntryDocument)).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('twilio-auth-token'), 'tok');
    await act(async () => fireEvent.press(screen.getByTestId('twilio-save')));
    expect(calls(docs.CrmAppCreateTwilioEntryDocument)[0]?.[1]).toEqual({
      input: {
        name: 'Twilio',
        category: 'TWILIO',
        is_default: true,
        is_active: true,
        config: [
          { key: 'account_sid', value: 'AC999' },
          { key: 'auth_token', value: 'tok' },
          { key: 'phone_number', value: '+14155552671' },
          { key: 'agent_phone_number', value: '' },
        ],
      },
    });
    await waitFor(() => expect(screen.getByTestId('twilio-test')).toBeOnTheScreen(), WAIT);
  });

  it('shows the server’s refusal (a CRM manager may not edit Twilio) with a retry', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEnvAccessStatusDocument,
          () => {
            throw new ApiError('Access Denied');
          },
        ],
      ]),
    );
    renderWithTheme(<TwilioSetupScreen />);
    expect(await screen.findByText('Access Denied', {}, WAIT)).toBeOnTheScreen();
    expect(screen.getByTestId('state-retry')).toBeOnTheScreen();
  });
});
