import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { buildSignupStepperLabels } from '@duncit/utils';

import { fallbackT } from '@/i18n/fallback';
import { requestSignupWhatsAppOtp, verifySignupWhatsAppOtp } from '@/services/auth.service';
import { renderWithProviders } from '@/utils/test-utils';
import { VerifyWhatsappStep } from '../VerifyWhatsappStep';

jest.mock('@/services/auth.service', () => ({
  ...jest.requireActual('@/services/auth.service'),
  requestSignupWhatsAppOtp: jest.fn(),
  verifySignupWhatsAppOtp: jest.fn(),
}));

const mockRequest = requestSignupWhatsAppOtp as jest.Mock;
const mockVerify = verifySignupWhatsAppOtp as jest.Mock;
const labels = buildSignupStepperLabels(fallbackT);

interface MountProps {
  extension?: string;
  creating?: boolean;
  refusal?: string | null;
}

function mount({ extension = '+91', creating = false, refusal }: MountProps = {}) {
  const onVerified = jest.fn();
  const view = renderWithProviders(
    <VerifyWhatsappStep
      extension={extension}
      number="9876543210"
      email="asha@example.com"
      creating={creating}
      onVerified={onVerified}
      refusal={refusal}
    />,
  );
  return { ...view, onVerified };
}

const isDisabled = (testID: string) => {
  const node = screen.getByTestId(testID);
  return node.props.accessibilityState?.disabled === true || node.props['aria-disabled'] === true;
};

/** Mounts with the automatic send already answered. */
async function ready(props: MountProps = {}, testCode: string | null = null) {
  mockRequest.mockResolvedValueOnce({ testCode });
  const view = mount(props);
  await waitFor(() => expect(screen.getByTestId('signup-resend')).toHaveTextContent(labels.resend));
  return view;
}

async function typeCode(code: string) {
  fireEvent.changeText(screen.getByTestId('field-otp'), code);
  await waitFor(() => expect(screen.getByTestId('field-otp').props.value).toBe(code));
}

beforeEach(() => jest.clearAllMocks());

describe('VerifyWhatsappStep — sending', () => {
  it('sends the code as the step opens, and only once', async () => {
    const { rerender, onVerified } = await ready({}, '123456');
    expect(mockRequest).toHaveBeenCalledWith('+91', '9876543210', 'asha@example.com');
    expect(screen.getByText(labels.codeSentTo('+91 9876543210'))).toBeOnTheScreen();
    expect(screen.getByTestId('signup-test-code')).toHaveTextContent(labels.testCode('123456'));

    rerender(
      <VerifyWhatsappStep
        extension="+91"
        number="9876543210"
        email="asha@example.com"
        creating={false}
        onVerified={onVerified}
      />,
    );
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('shows no test code when the server sends none, and trims a missing dial code', async () => {
    await ready({ extension: '' });
    expect(screen.queryByTestId('signup-test-code')).toBeNull();
    expect(screen.getByText(labels.codeSentTo('9876543210'))).toBeOnTheScreen();
  });

  it('shows the sending label while the code is on its way, then offers a resend', async () => {
    let resolve: (v: { testCode: string | null }) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    mount();
    await waitFor(() =>
      expect(screen.getByTestId('signup-resend')).toHaveTextContent(labels.sending),
    );
    await act(async () => resolve({ testCode: null }));
    expect(screen.getByTestId('signup-resend')).toHaveTextContent(labels.resend);

    mockRequest.mockResolvedValueOnce({ testCode: '654321' });
    fireEvent.press(screen.getByTestId('signup-resend'));
    await waitFor(() => expect(screen.getByTestId('signup-test-code')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('shows why the send failed', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Number not on WhatsApp'));
    mount();
    await waitFor(() =>
      expect(screen.getByTestId('signup-verify-error')).toHaveTextContent('Number not on WhatsApp'),
    );
  });

  it('falls back to the generic copy for a bare send failure', async () => {
    mockRequest.mockRejectedValueOnce({});
    mount();
    await waitFor(() =>
      expect(screen.getByTestId('signup-verify-error')).toHaveTextContent(
        fallbackT('mweb.auth.somethingWentWrong'),
      ),
    );
  });
});

describe('VerifyWhatsappStep — verifying', () => {
  it('keeps Verify disabled until a full code is typed', async () => {
    await ready();
    expect(isDisabled('signup-verify')).toBe(true);
    expect(screen.getByTestId('signup-verify').props['aria-label']).toBe(labels.verify);
    await typeCode('123');
    expect(isDisabled('signup-verify')).toBe(true);
    await typeCode('123456');
    await waitFor(() => expect(isDisabled('signup-verify')).toBe(false));
  });

  it('proves the number and hands the token on', async () => {
    mockVerify.mockResolvedValueOnce('wa-token');
    const { onVerified } = await ready();
    await typeCode('123456');
    await waitFor(() => expect(isDisabled('signup-verify')).toBe(false));
    fireEvent.press(screen.getByTestId('signup-verify'));
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('wa-token'));
    expect(mockVerify).toHaveBeenCalledWith('+91', '9876543210', '123456');
    expect(screen.queryByTestId('signup-verify-error')).toBeNull();
  });

  it('says it is verifying while the proof is out', async () => {
    let resolve: (v: string) => void = () => undefined;
    mockVerify.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { onVerified } = await ready();
    await typeCode('123456');
    await waitFor(() => expect(isDisabled('signup-verify')).toBe(false));
    fireEvent.press(screen.getByTestId('signup-verify'));
    await waitFor(() => expect(isDisabled('signup-verify')).toBe(true));
    expect(screen.getByTestId('signup-verify').props['aria-label']).toBe(labels.verifying);
    expect(screen.getByTestId('signup-verify-spinner')).toBeOnTheScreen();
    await act(async () => resolve('tok'));
    expect(onVerified).toHaveBeenCalledWith('tok');
  });

  it('shows why a wrong code was refused and does not continue', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Wrong code'));
    const { onVerified } = await ready();
    await typeCode('000000');
    await waitFor(() => expect(isDisabled('signup-verify')).toBe(false));
    fireEvent.press(screen.getByTestId('signup-verify'));
    await waitFor(() =>
      expect(screen.getByTestId('signup-verify-error')).toHaveTextContent('Wrong code'),
    );
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('falls back to the generic copy for a bare verify failure', async () => {
    mockVerify.mockRejectedValueOnce(undefined);
    await ready();
    await typeCode('000000');
    await waitFor(() => expect(isDisabled('signup-verify')).toBe(false));
    fireEvent.press(screen.getByTestId('signup-verify'));
    await waitFor(() =>
      expect(screen.getByTestId('signup-verify-error')).toHaveTextContent(
        fallbackT('mweb.auth.somethingWentWrong'),
      ),
    );
  });
});

describe('VerifyWhatsappStep — account creation', () => {
  it('locks the step while the account is being created', async () => {
    await ready({ creating: true });
    await typeCode('123456');
    expect(isDisabled('signup-verify')).toBe(true);
    expect(screen.getByTestId('signup-verify').props['aria-label']).toBe(labels.creating);
  });

  it('shows the account refusal when the step has no error of its own', async () => {
    await ready({ refusal: 'Email already in use' });
    expect(screen.getByTestId('signup-verify-error')).toHaveTextContent('Email already in use');
  });

  it('puts its own error ahead of the refusal', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Send failed'));
    mount({ refusal: 'Email already in use' });
    await waitFor(() =>
      expect(screen.getByTestId('signup-verify-error')).toHaveTextContent('Send failed'),
    );
  });
});
