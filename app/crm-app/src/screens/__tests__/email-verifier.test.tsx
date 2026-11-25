import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import {
  CrmAppEmailVerificationsDocument,
  CrmAppVerifyEmailDocument,
} from '@/graphql/emailVerification';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { EmailVerifierScreen } from '../email-verifier/EmailVerifierScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

const request = gqlRequest as jest.Mock;
const RESULT = {
  id: 'e1',
  email: 'asha@gmial.com',
  status: 'RISKY',
  is_valid_syntax: true,
  accepts_mail: true,
  is_deliverable: false,
  is_catch_all: true,
  is_disposable: false,
  is_role_account: false,
  suggestion: 'asha@gmail.com',
  created_at: '2026-11-25T10:00:00.000Z',
};

const serve = (verify: () => unknown = () => ({ crmVerifyEmail: RESULT })) =>
  request.mockImplementation(async (doc: unknown) => {
    if (doc === CrmAppVerifyEmailDocument) return verify();
    if (doc === CrmAppEmailVerificationsDocument) {
      return {
        crmEmailVerificationsTable: {
          total: 1,
          rows: [{ id: 'e0', email: 'old@duncit.com', status: 'VERIFIED', created_at: null }],
        },
      };
    }
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('EmailVerifierScreen', () => {
  it('checks an address and shows the verdict, the facts and a suggested spelling', async () => {
    renderWithTheme(<EmailVerifierScreen />);
    fireEvent.changeText(screen.getByTestId('email-verify-email'), ' asha@gmial.com ');
    await act(async () => fireEvent.press(screen.getByTestId('email-verify-submit')));
    expect(callsTo(CrmAppVerifyEmailDocument)[0]?.[1]).toEqual({ email: 'asha@gmial.com' });
    expect(screen.getByTestId('email-verify-result')).toBeOnTheScreen();
    expect(screen.getByText('Risky')).toBeOnTheScreen();
    expect(screen.getByText(/Mailbox exists: No/)).toBeOnTheScreen();
    expect(screen.getByTestId('email-verify-suggestion')).toHaveTextContent(/asha@gmail\.com/);
  });

  it('refuses a malformed address before asking the server', async () => {
    renderWithTheme(<EmailVerifierScreen />);
    fireEvent.changeText(screen.getByTestId('email-verify-email'), 'asha@');
    await act(async () => fireEvent.press(screen.getByTestId('email-verify-submit')));
    expect(screen.getByTestId('email-verify-email-error')).toBeOnTheScreen();
    expect(callsTo(CrmAppVerifyEmailDocument)).toHaveLength(0);
  });

  it('says why a check failed', async () => {
    serve(() => {
      throw new Error('The verifier is not configured');
    });
    renderWithTheme(<EmailVerifierScreen />);
    fireEvent.changeText(screen.getByTestId('email-verify-email'), 'asha@duncit.com');
    await act(async () => fireEvent.press(screen.getByTestId('email-verify-submit')));
    expect(screen.getByTestId('email-verify-error')).toHaveTextContent(
      'The verifier is not configured',
    );
  });

  it('lists past checks newest first and searches them', async () => {
    renderWithTheme(<EmailVerifierScreen />);
    expect(await screen.findByText('old@duncit.com', {}, { timeout: 2000 })).toBeOnTheScreen();
    expect(callsTo(CrmAppEmailVerificationsDocument)[0]?.[1]).toEqual({
      query: { search: null, page: 1, page_size: 25, sort_by: 'created_at', sort_dir: 'desc' },
    });
    fireEvent.changeText(screen.getByTestId('email-verify-search'), 'old');
    await waitFor(
      () => expect(callsTo(CrmAppEmailVerificationsDocument).at(-1)?.[1].query.search).toBe('old'),
      {
        timeout: 2000,
      },
    );
  });
});
