import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { makeEnvEntry } from '../mocks/env-entry.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import Msg91TestPanel from '../../src/pages/environment/test-panels/msg91';
import {
  retryOtpInput,
  sendOtpInput,
  verifyOtpInput,
  verifyTokenInput,
} from '../../src/pages/environment/test-panels/msg91/msg91-test.types';

const entry = makeEnvEntry({ id: 'e1', name: 'MSG91 main' });

const answer = (over: Record<string, unknown> = {}) => ({
  data: { testEnvMsg91: { ok: true, message: 'Done', data: null, ...over } },
});

beforeEach(() => {
  resetOps();
  mutation('TestEnvMsg91').mockResolvedValue(answer());
});

const form = (testId: string) => within(screen.getByTestId(testId));
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

const sendOtp = async (number = '9876543210') => {
  const send = form('msg91-send-otp');
  type(send.getByLabelText('Phone number'), number);
  fireEvent.click(send.getByRole('button', { name: 'Send OTP' }));
};

describe('MSG91 test inputs', () => {
  it('trims every field and maps the retry channel to a number or null', () => {
    expect(sendOtpInput({ extension: ' +91 ', number: ' 98765 ' })).toEqual({
      action: 'SEND_OTP',
      phone_extension: '+91',
      phone_number: '98765',
    });
    expect(retryOtpInput({ req_id: ' r1 ', retry_channel: '4' })).toEqual({
      action: 'RETRY_OTP',
      req_id: 'r1',
      retry_channel: 4,
    });
    expect(retryOtpInput({ req_id: 'r1', retry_channel: '' }).retry_channel).toBeNull();
    expect(verifyOtpInput({ req_id: ' r1 ', otp: ' 123456 ' })).toEqual({
      action: 'VERIFY_OTP',
      req_id: 'r1',
      otp: '123456',
    });
    expect(verifyTokenInput({ access_token: ' tok ' })).toEqual({
      action: 'VERIFY_ACCESS_TOKEN',
      access_token: 'tok',
    });
  });
});

describe('MSG91 Send OTP', () => {
  it('asks for confirmation naming the number, then sends and shows the request id', async () => {
    ops.confirm.mockResolvedValue(true);
    mutation('TestEnvMsg91').mockResolvedValue(answer({ message: 'OTP sent', data: 'req-123' }));
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    await sendOtp();
    await waitFor(() =>
      expect(ops.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Send a real SMS?',
          message: expect.stringContaining('9876543210'),
        })
      )
    );
    await waitFor(() =>
      expect(mutation('TestEnvMsg91')).toHaveBeenCalledWith({
        variables: {
          id: 'e1',
          input: expect.objectContaining({ action: 'SEND_OTP', phone_number: '9876543210' }),
        },
      })
    );
    expect(await screen.findByText('OTP sent')).toBeInTheDocument();
    expect(form('msg91-send-otp').getByLabelText('Returned value')).toHaveValue('req-123');
    // The next steps are handed the request id.
    expect(form('msg91-retry-otp').getByLabelText('Request ID')).toHaveValue('req-123');
    expect(form('msg91-verify-otp').getByLabelText('Request ID')).toHaveValue('req-123');
  });

  it('sends nothing when the operator declines the billed SMS', async () => {
    ops.confirm.mockResolvedValue(false);
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    await sendOtp();
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('TestEnvMsg91')).not.toHaveBeenCalled();
  });

  it('does not even ask while the number is invalid', async () => {
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    await sendOtp('12');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ops.confirm).not.toHaveBeenCalled();
    expect(mutation('TestEnvMsg91')).not.toHaveBeenCalled();
  });

  it('shows MSG91 refusal without handing anything on', async () => {
    ops.confirm.mockResolvedValue(true);
    mutation('TestEnvMsg91').mockResolvedValue(answer({ ok: false, message: 'Widget not found', data: 'ignored' }));
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    await sendOtp();
    expect(await screen.findByText('Widget not found')).toBeInTheDocument();
    expect(form('msg91-send-otp').queryByLabelText('Returned value')).not.toBeInTheDocument();
    expect(form('msg91-retry-otp').getByLabelText('Request ID')).toHaveValue('');
  });

  it('shows the error when the call itself fails', async () => {
    ops.confirm.mockResolvedValue(true);
    mutation('TestEnvMsg91').mockRejectedValue(new Error('network down'));
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    await sendOtp();
    expect(await screen.findByText(/network down/)).toBeInTheDocument();
  });

  it('shows nothing when the server answers with no payload', async () => {
    ops.confirm.mockResolvedValue(true);
    mutation('TestEnvMsg91').mockResolvedValue({ data: {} });
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    await sendOtp();
    await waitFor(() => expect(mutation('TestEnvMsg91')).toHaveBeenCalled());
    expect(form('msg91-send-otp').queryByRole('alert')).not.toBeInTheDocument();
  });

  it('labels every step Working… and disables it while a call is in flight', () => {
    ops.mutLoading.TestEnvMsg91 = true;
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    const buttons = screen.getAllByRole('button', { name: 'Working…' });
    expect(buttons).toHaveLength(4);
    buttons.forEach((b) => expect(b).toBeDisabled());
  });
});

describe('MSG91 Retry, Verify and token steps', () => {
  it('retries a request over the chosen channel', async () => {
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    const retry = form('msg91-retry-otp');
    type(retry.getByLabelText('Request ID'), ' req-9 ');
    fireEvent.mouseDown(retry.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Voice call' }));
    fireEvent.click(retry.getByRole('button', { name: 'Retry OTP' }));
    await waitFor(() =>
      expect(mutation('TestEnvMsg91')).toHaveBeenCalledWith({
        variables: { id: 'e1', input: { action: 'RETRY_OTP', req_id: 'req-9', retry_channel: 4 } },
      })
    );
    expect(await screen.findByText('Done')).toBeInTheDocument();
  });

  it('leaves the channel to the widget by default', async () => {
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    const retry = form('msg91-retry-otp');
    type(retry.getByLabelText('Request ID'), 'req-9');
    fireEvent.click(retry.getByRole('button', { name: 'Retry OTP' }));
    await waitFor(() =>
      expect(mutation('TestEnvMsg91')).toHaveBeenCalledWith({
        variables: { id: 'e1', input: { action: 'RETRY_OTP', req_id: 'req-9', retry_channel: null } },
      })
    );
  });

  it('refuses a retry without a request id', async () => {
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    fireEvent.click(form('msg91-retry-otp').getByRole('button', { name: 'Retry OTP' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mutation('TestEnvMsg91')).not.toHaveBeenCalled();
  });

  it('rejects a code outside 4-9 digits and verifies a valid one, handing on the token', async () => {
    mutation('TestEnvMsg91').mockResolvedValue(answer({ message: 'Verified', data: 'access-tok' }));
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    const verify = form('msg91-verify-otp');
    type(verify.getByLabelText('Request ID'), 'req-1');
    type(verify.getByLabelText('Code'), '12');
    fireEvent.click(verify.getByRole('button', { name: 'Verify OTP' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mutation('TestEnvMsg91')).not.toHaveBeenCalled();

    type(verify.getByLabelText('Code'), ' 123456 ');
    fireEvent.click(verify.getByRole('button', { name: 'Verify OTP' }));
    await waitFor(() =>
      expect(mutation('TestEnvMsg91')).toHaveBeenCalledWith({
        variables: { id: 'e1', input: { action: 'VERIFY_OTP', req_id: 'req-1', otp: '123456' } },
      })
    );
    await waitFor(() => expect(form('msg91-verify-token').getByLabelText('Access token')).toHaveValue('access-tok'));
  });

  it('verifies an access token and reports MSG91 refusal', async () => {
    mutation('TestEnvMsg91').mockResolvedValue(answer({ ok: false, message: 'Token not issued' }));
    renderWithProviders(<Msg91TestPanel entry={entry} />);
    const token = form('msg91-verify-token');
    fireEvent.click(token.getByRole('button', { name: 'Verify token' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mutation('TestEnvMsg91')).not.toHaveBeenCalled();

    type(token.getByLabelText('Access token'), ' tok-1 ');
    fireEvent.click(token.getByRole('button', { name: 'Verify token' }));
    await waitFor(() =>
      expect(mutation('TestEnvMsg91')).toHaveBeenCalledWith({
        variables: { id: 'e1', input: { action: 'VERIFY_ACCESS_TOKEN', access_token: 'tok-1' } },
      })
    );
    expect(await screen.findByText('Token not issued')).toBeInTheDocument();
  });
});
