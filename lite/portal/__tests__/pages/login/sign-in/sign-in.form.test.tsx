import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_REQUEST_SIGN_IN_CODE, LITE_VERIFY_SIGN_IN_CODE } from '../../../../../shared/graphql/documents';
import { SignInForm } from '../../../../pages/login/sign-in';
import { makeMe } from '../../../fixtures';
import { gqlUser } from '../../../gql-results';
import { findToast, renderWithProviders, type GqlMock } from '../../../test-utils';

const session = vi.hoisted(() => ({ completeSignIn: vi.fn((_token: string) => Promise.resolve()) }));

vi.mock('../../../../../shared/session', async () => {
  const fixtures = await import('../../../fixtures');
  return { useLiteSession: () => fixtures.makeSession({ signedIn: false, me: null, completeSignIn: session.completeSignIn }) };
});

beforeEach(() => {
  session.completeSignIn.mockClear();
});

const EMAIL = 'asha@lite.example';

const requestCode = (over: Record<string, unknown> = {}): GqlMock => ({
  request: { query: LITE_REQUEST_SIGN_IN_CODE, variables: { email: EMAIL } },
  result: { data: { liteRequestSignInCode: { __typename: 'LiteSignInRequest', ok: true, via: 'LITE', expires_in_minutes: 10, resend_after_seconds: 0, test_code: null, ...over } } },
});
const verifyCode = (code: string, token: string): GqlMock => ({
  request: { query: LITE_VERIFY_SIGN_IN_CODE, variables: { email: EMAIL, code } },
  result: { data: { liteVerifySignInCode: { __typename: 'LiteAuthPayload', token, user: gqlUser(makeMe({ is_admin: true })) } } },
});

const askForCode = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByTestId('sign-in-email'), EMAIL);
  await user.click(screen.getByTestId('sign-in-send-code'));
};

describe('SignInForm', () => {
  it('moves from the email to the code once a code is sent, then signs in with the token', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />, { mocks: [requestCode(), verifyCode('123456', 'tok-123')] });
    await askForCode(user);
    expect(await findToast('success')).toHaveTextContent('Code sent');
    expect(await screen.findByTestId('sign-in-code-sent')).toHaveTextContent(`We emailed a 6-digit code to ${EMAIL}.`);
    await user.type(screen.getByTestId('sign-in-code'), '123456');
    await user.click(screen.getByTestId('sign-in-verify'));
    await waitFor(() => expect(session.completeSignIn).toHaveBeenCalledWith('tok-123'));
  });

  it("stays on the email with the API's message when no code can be sent", async () => {
    const user = userEvent.setup();
    const refused: GqlMock = { request: { query: LITE_REQUEST_SIGN_IN_CODE, variables: { email: EMAIL } }, result: { errors: [new GraphQLError('Too many attempts. Try again later.')] } };
    renderWithProviders(<SignInForm />, { mocks: [refused] });
    await askForCode(user);
    expect(await findToast('error')).toHaveTextContent('Too many attempts. Try again later.');
    expect(screen.getByTestId('sign-in-email-form')).toBeInTheDocument();
  });

  it('stays on the email when the server answers without a request', async () => {
    const user = userEvent.setup();
    const answered = vi.fn(() => ({ data: { liteRequestSignInCode: null } }));
    renderWithProviders(<SignInForm />, { mocks: [{ request: { query: LITE_REQUEST_SIGN_IN_CODE, variables: { email: EMAIL } }, result: answered }] });
    await askForCode(user);
    await waitFor(() => expect(answered).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('sign-in-send-code')).toBeEnabled());
    expect(screen.getByTestId('sign-in-email-form')).toBeInTheDocument();
    expect(screen.queryByTestId('notify-success')).not.toBeInTheDocument();
  });

  it('does not sign in on a wrong code and says why', async () => {
    const user = userEvent.setup();
    const wrong: GqlMock = { request: { query: LITE_VERIFY_SIGN_IN_CODE, variables: { email: EMAIL, code: '000000' } }, result: { errors: [new GraphQLError('That code is not right')] } };
    renderWithProviders(<SignInForm />, { mocks: [requestCode(), wrong] });
    await askForCode(user);
    await user.type(await screen.findByTestId('sign-in-code'), '000000');
    await user.click(screen.getByTestId('sign-in-verify'));
    expect(await findToast('error')).toHaveTextContent('That code is not right');
    expect(session.completeSignIn).not.toHaveBeenCalled();
    expect(screen.getByTestId('sign-in-code-form')).toBeInTheDocument();
  });

  it('does not sign in when the server returns no token', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />, { mocks: [requestCode(), verifyCode('123456', '')] });
    await askForCode(user);
    await user.type(await screen.findByTestId('sign-in-code'), '123456');
    await user.click(screen.getByTestId('sign-in-verify'));
    await waitFor(() => expect(screen.getByTestId('sign-in-verify')).toBeEnabled());
    expect(session.completeSignIn).not.toHaveBeenCalled();
  });

  it('asks the server again for the same address on resend', async () => {
    const user = userEvent.setup();
    const second = vi.fn(() => ({ data: { liteRequestSignInCode: { __typename: 'LiteSignInRequest', ok: true, via: 'DUNCIT', expires_in_minutes: 10, resend_after_seconds: 0, test_code: null } } }));
    renderWithProviders(<SignInForm />, { mocks: [requestCode(), { request: { query: LITE_REQUEST_SIGN_IN_CODE, variables: { email: EMAIL } }, result: second }] });
    await askForCode(user);
    await user.click(await screen.findByTestId('sign-in-resend'));
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(`Your Duncit account emailed you a 6-digit code for ${EMAIL}. It works for 10 minutes.`)).toBeInTheDocument();
  });

  it('goes back to the email step to use a different address', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />, { mocks: [requestCode({ test_code: '111222' })] });
    await askForCode(user);
    expect(await screen.findByTestId('sign-in-test-code')).toHaveTextContent('111222');
    await user.click(screen.getByTestId('sign-in-change-email'));
    expect(await screen.findByTestId('sign-in-email-form')).toBeInTheDocument();
  });
});
