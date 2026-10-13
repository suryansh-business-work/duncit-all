import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

import { buildCommPreferenceLabels } from '@duncit/utils';
import { fallbackT } from '../../../../i18n/fallback';
import AuthMessagesCard from '../AuthMessagesCard';
import { opLink, type OpHandler } from '../../../../__tests__/op-link';

vi.mock('@duncit/logs', async (orig) => {
  const actual = await orig<typeof import('@duncit/logs')>();
  return { ...actual, logs: { ...actual.logs, mWeb: { ...actual.logs.mWeb, error: vi.fn() } } };
});

type Row = { channel: 'EMAIL' | 'WHATSAPP' | 'SMS'; reachable: boolean; destination: string; otp_enabled: boolean; otp_can_disable: boolean };

const sheet = (channels: Row[]) => ({
  __typename: 'CommunicationPreference',
  updated_at: null,
  channels: channels.map((c) => ({ __typename: 'CommChannelPreference', ...c })),
});

const email = (over: Partial<Row> = {}): Row => ({
  channel: 'EMAIL',
  reachable: true,
  destination: 'riya@example.test',
  otp_enabled: true,
  otp_can_disable: true,
  ...over,
});

function mount(channels: Row[], handlers: Record<string, OpHandler> = {}, channel: Row['channel'] = 'EMAIL') {
  const ops = opLink({ MyCommunicationPreference: () => ({ myCommunicationPreference: sheet(channels) }), ...handlers });
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={ops.link}>
      <AuthMessagesCard channel={channel} />
    </MockedProvider>,
  );
  return ops;
}

const toggle = async () => {
  const card = await screen.findByTestId('auth-messages-EMAIL');
  return card.querySelector('input[type="checkbox"]') as HTMLInputElement;
};

describe('AuthMessagesCard', () => {
  it('shows nothing for a channel the sheet does not list', async () => {
    const ops = mount([email()], {}, 'SMS');
    await waitFor(() => expect(ops.callsTo('MyCommunicationPreference')).toHaveLength(1));
    expect(screen.queryByTestId('auth-messages-SMS')).not.toBeInTheDocument();
  });

  it('shows where codes are sent and switches the channel off, then confirms it saved', async () => {
    const ops = mount([email()], {
      SetMyOtpChannel: () => ({ setMyOtpChannel: sheet([email({ otp_enabled: false })]) }),
    });
    const input = await toggle();
    expect(screen.getByText(/riya@example\.test/)).toBeInTheDocument();
    expect(input).toBeChecked();
    expect(input).toBeEnabled();
    fireEvent.click(input);
    await waitFor(() => expect(ops.callsTo('SetMyOtpChannel')).toHaveLength(1));
    expect(ops.callsTo('SetMyOtpChannel')[0]?.variables).toEqual({ channel: 'EMAIL', enabled: false });
    await waitFor(async () => expect(await toggle()).not.toBeChecked());
    expect(await screen.findByText(buildCommPreferenceLabels(fallbackT).saved)).toBeInTheDocument();
  });

  it('locks the switch when this is the last channel that can carry a code', async () => {
    mount([email({ otp_can_disable: false })]);
    const input = await toggle();
    expect(input).toBeDisabled();
    expect(input).toBeChecked();
  });

  it('draws no switch for a channel with no address on the account', async () => {
    mount([email({ reachable: false, destination: '', otp_enabled: false, otp_can_disable: false })]);
    await screen.findByTestId('auth-messages-EMAIL');
    expect(screen.getByTestId('auth-messages-EMAIL').querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('tells the person the change did not save and leaves the switch as it was', async () => {
    mount([email()], {
      SetMyOtpChannel: () => {
        throw new Error('server unavailable');
      },
    });
    const input = await toggle();
    fireEvent.click(input);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(async () => expect(await toggle()).toBeChecked());
  });
});
