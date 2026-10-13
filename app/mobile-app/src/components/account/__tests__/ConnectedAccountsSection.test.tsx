import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ConnectedAccountsSection } from '@/components/account/ConnectedAccountsSection';
import {
  MobileConnectGoogleAccountDocument,
  MobileDisconnectGoogleAccountDocument,
  MobileMyConnectedAccountsDocument,
} from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// The Google SDK is native; the stub exposes the two outcomes it can report.
jest.mock('@/components/GoogleAuthButton', () => {
  const { Pressable: P, Text: T } = jest.requireActual('react-native');
  return {
    GoogleAuthButton: (props: {
      disabled?: boolean;
      onIdToken: (token: string) => void;
      onError: (message: string) => void;
    }) => (
      <>
        <P
          testID="google-token"
          disabled={props.disabled}
          onPress={() => props.onIdToken('id-tok')}
        >
          <T>token</T>
        </P>
        <P testID="google-error" onPress={() => props.onError('Google sign-in cancelled')}>
          <T>error</T>
        </P>
      </>
    ),
  };
});

const mockRequest = graphqlRequest as jest.Mock;

const passwordOnly = { email: 'asha@example.com', has_password: true, google: null };
const withGoogle = {
  email: 'asha@example.com',
  has_password: true,
  google: { google_email: 'asha@gmail.example', linked_at: '2026-03-04T10:00:00.000Z' },
};
const googleOnly = { email: 'asha@example.com', has_password: false, google: withGoogle.google };

type Answers = Map<unknown, unknown>;
function answer(answers: Answers) {
  mockRequest.mockImplementation(async (doc: unknown) => {
    const value = answers.get(doc);
    if (value instanceof Error) throw value;
    return value;
  });
}
const initial = (accounts: unknown): Answers =>
  new Map([[MobileMyConnectedAccountsDocument, { myConnectedAccounts: accounts }]]);

async function mount(answers: Answers) {
  answer(answers);
  renderWithProviders(<ConnectedAccountsSection />);
  await waitFor(() => expect(mockRequest).toHaveBeenCalled());
  await act(async () => {});
}

beforeEach(() => mockRequest.mockReset());

describe('ConnectedAccountsSection', () => {
  it('shows the email method active and offers Connect when Google is not linked', async () => {
    await mount(initial(passwordOnly));
    expect(screen.getByTestId('connected-email-value')).toHaveTextContent('asha@example.com');
    expect(screen.getByTestId('google-token')).toBeTruthy();
    expect(screen.queryByTestId('connected-google-action')).toBeNull();
  });

  it('shows the linked Google account with Disconnect when a password exists', async () => {
    await mount(initial(withGoogle));
    expect(screen.getByTestId('connected-google-value')).toHaveTextContent('asha@gmail.example');
    expect(screen.getByTestId('connected-google-action')).toBeTruthy();
    expect(screen.queryByTestId('google-token')).toBeNull();
  });

  it('explains instead of offering Disconnect when Google is the only way in', async () => {
    await mount(initial(googleOnly));
    expect(screen.queryByTestId('connected-google-action')).toBeNull();
    expect(screen.getByTestId('connected-google-value')).toHaveTextContent('asha@gmail.example');
  });

  it('shows the load failure', async () => {
    await mount(new Map([[MobileMyConnectedAccountsDocument, new Error('Not signed in')]]));
    expect(screen.getByTestId('connected-error')).toHaveTextContent('Not signed in');
  });

  it('connects Google with the id token and shows the updated account', async () => {
    const answers = initial(passwordOnly);
    answers.set(MobileConnectGoogleAccountDocument, { connectGoogleAccount: withGoogle });
    await mount(answers);
    await act(async () => {
      fireEvent.press(screen.getByTestId('google-token'));
    });
    const call = mockRequest.mock.calls.find((c) => c[0] === MobileConnectGoogleAccountDocument);
    expect(call?.[1]).toEqual({ input: { id_token: 'id-tok' } });
    expect(call?.[2]).toEqual({ auth: true });
    expect(screen.getByTestId('connected-google-value')).toHaveTextContent('asha@gmail.example');
  });

  it('shows why connecting failed and keeps the Connect button', async () => {
    const answers = initial(passwordOnly);
    answers.set(MobileConnectGoogleAccountDocument, new Error('Google account already linked'));
    await mount(answers);
    await act(async () => {
      fireEvent.press(screen.getByTestId('google-token'));
    });
    expect(screen.getByTestId('connected-error')).toHaveTextContent(
      'Google account already linked',
    );
    expect(screen.getByTestId('google-token')).toBeTruthy();
  });

  it('shows an error reported by the Google button itself', async () => {
    await mount(initial(passwordOnly));
    fireEvent.press(screen.getByTestId('google-error'));
    expect(screen.getByTestId('connected-error')).toHaveTextContent('Google sign-in cancelled');
  });

  it('disconnects only after confirmation', async () => {
    const answers = initial(withGoogle);
    answers.set(MobileDisconnectGoogleAccountDocument, {
      disconnectGoogleAccount: passwordOnly,
    });
    await mount(answers);
    fireEvent.press(screen.getByTestId('connected-google-action'));
    expect(mockRequest.mock.calls.some((c) => c[0] === MobileDisconnectGoogleAccountDocument)).toBe(
      false,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('disconnect-google-confirm-confirm'));
    });
    expect(mockRequest.mock.calls.some((c) => c[0] === MobileDisconnectGoogleAccountDocument)).toBe(
      true,
    );
    expect(screen.queryByTestId('connected-google-action')).toBeNull();
    expect(screen.getByTestId('google-token')).toBeTruthy();
  });

  it('cancelling the confirmation keeps Google connected', async () => {
    await mount(initial(withGoogle));
    fireEvent.press(screen.getByTestId('connected-google-action'));
    fireEvent.press(screen.getByTestId('disconnect-google-confirm-cancel'));
    expect(mockRequest.mock.calls.some((c) => c[0] === MobileDisconnectGoogleAccountDocument)).toBe(
      false,
    );
    expect(screen.getByTestId('connected-google-action')).toBeTruthy();
  });

  it('shows why a disconnect failed', async () => {
    const answers = initial(withGoogle);
    answers.set(MobileDisconnectGoogleAccountDocument, new Error('Set a password first'));
    await mount(answers);
    fireEvent.press(screen.getByTestId('connected-google-action'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('disconnect-google-confirm-confirm'));
    });
    expect(screen.getByTestId('connected-error')).toHaveTextContent('Set a password first');
  });
});
