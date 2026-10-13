import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

import VerifyWhatsappStep from '../VerifyWhatsappStep';
import { opLink, type OpHandler } from '../../../__tests__/op-link';

function mount(handlers: Record<string, OpHandler>, over: Partial<Parameters<typeof VerifyWhatsappStep>[0]> = {}) {
  const ops = opLink(handlers);
  const onVerified = vi.fn();
  const view = render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={ops.link}>
      <VerifyWhatsappStep
        extension="+91"
        number="9000000001"
        email="new.person@example.test"
        creating={false}
        onVerified={onVerified}
        {...over}
      />
    </MockedProvider>,
  );
  return { ops, onVerified, ...view };
}

const sent = (dev_otp: string | null = null) => () => ({
  requestSignupWhatsAppOtp: { __typename: 'OtpResult', ok: true, dev_otp },
});
const typeCode = (value: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value } });

describe('VerifyWhatsappStep', () => {
  it('sends the code as soon as the step opens, with the number and the address', async () => {
    const { ops } = mount({ RequestSignupWhatsAppOtp: sent('123456') });
    await waitFor(() => expect(ops.callsTo('RequestSignupWhatsAppOtp')).toHaveLength(1));
    expect(ops.callsTo('RequestSignupWhatsAppOtp')[0]?.variables).toEqual({
      ext: '+91',
      num: '9000000001',
      email: 'new.person@example.test',
    });
    expect(await screen.findByTestId('signup-test-code')).toHaveTextContent('123456');
  });

  it('keeps verify shut until six digits are typed, then hands the proof token on', async () => {
    const { ops, onVerified } = mount({
      RequestSignupWhatsAppOtp: sent(),
      VerifySignupWhatsAppOtp: () => ({
        verifySignupWhatsAppOtp: { __typename: 'OtpProof', ok: true, whatsapp_token: 'proof-token' },
      }),
    });
    await waitFor(() => expect(ops.callsTo('RequestSignupWhatsAppOtp')).toHaveLength(1));
    expect(screen.queryByTestId('signup-test-code')).not.toBeInTheDocument();
    expect(screen.getByTestId('signup-verify')).toBeDisabled();
    typeCode('12');
    expect(screen.getByTestId('signup-verify')).toBeDisabled();
    typeCode('654321');
    await waitFor(() => expect(screen.getByTestId('signup-verify')).toBeEnabled());
    fireEvent.click(screen.getByTestId('signup-verify'));
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('proof-token'));
    expect(ops.callsTo('VerifySignupWhatsAppOtp')[0]?.variables).toEqual({
      ext: '+91',
      num: '9000000001',
      otp: '654321',
    });
  });

  it('shows a wrong code and does not move on', async () => {
    const { onVerified } = mount({
      RequestSignupWhatsAppOtp: sent(),
      VerifySignupWhatsAppOtp: () => {
        throw new Error('That code is not right');
      },
    });
    await waitFor(() => expect(screen.getByTestId('signup-verify')).toBeDisabled());
    typeCode('000000');
    await waitFor(() => expect(screen.getByTestId('signup-verify')).toBeEnabled());
    fireEvent.click(screen.getByTestId('signup-verify'));
    expect(await screen.findByTestId('signup-verify-error')).toHaveTextContent('not right');
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('shows why the code could not be sent, and resends on request', async () => {
    let calls = 0;
    const { ops } = mount({
      RequestSignupWhatsAppOtp: () => {
        calls += 1;
        if (calls === 1) throw new Error('Too many codes requested');
        return sent('777777')();
      },
    });
    expect(await screen.findByTestId('signup-verify-error')).toHaveTextContent('Too many codes');
    fireEvent.click(screen.getByTestId('signup-resend'));
    expect(await screen.findByTestId('signup-test-code')).toHaveTextContent('777777');
    expect(screen.queryByTestId('signup-verify-error')).not.toBeInTheDocument();
    expect(ops.callsTo('RequestSignupWhatsAppOtp')).toHaveLength(2);
  });

  it('omits the address when there is none, and shows the account refusal while creating', async () => {
    const { ops } = mount(
      { RequestSignupWhatsAppOtp: sent() },
      { email: undefined, creating: true, refusal: 'This number already has an account' },
    );
    await waitFor(() => expect(ops.callsTo('RequestSignupWhatsAppOtp')).toHaveLength(1));
    expect(ops.callsTo('RequestSignupWhatsAppOtp')[0]?.variables).toMatchObject({ email: null });
    expect(screen.getByTestId('signup-verify-error')).toHaveTextContent('already has an account');
    expect(screen.getByTestId('signup-verify')).toBeDisabled();
  });
});
