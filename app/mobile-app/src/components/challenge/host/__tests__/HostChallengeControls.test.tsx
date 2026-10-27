import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HostChallengeControls } from '@/components/challenge/host/HostChallengeControls';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const challengeOf = (patch: Record<string, unknown> = {}) =>
  ({
    name: 'Derby',
    status: 'SCHEDULED',
    enabled: false,
    show_on_pod_details: true,
    audience_interaction_enabled: false,
    auto_whatsapp: true,
    auto_email: false,
    viewer: { allowed_actions: ['START', 'CANCEL'] },
    ...patch,
  }) as unknown as PodChallengeView;

const actionsOf = (busy = false) =>
  ({
    busy,
    transition: jest.fn().mockResolvedValue(true),
    toggle: jest.fn().mockResolvedValue(true),
  }) as unknown as HostChallengeActions & { transition: jest.Mock; toggle: jest.Mock };

const mount = (challenge = challengeOf(), actions = actionsOf()) => {
  renderWithProviders(<HostChallengeControls challenge={challenge} actions={actions} />);
  return actions;
};

describe('HostChallengeControls — lifecycle', () => {
  it('shows a button per allowed action with its label', () => {
    mount(challengeOf({ viewer: { allowed_actions: ['START', 'PAUSE', 'MYSTERY'] } }));
    expect(screen.getByText('mweb.challenge.actions.START')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.actions.PAUSE')).toBeOnTheScreen();
    // An action without a copy key reads as its own name rather than blank.
    expect(screen.getByText('MYSTERY')).toBeOnTheScreen();
  });

  it('runs a plain action straight away', () => {
    const actions = mount(
      challengeOf({ viewer: { allowed_actions: ['START', 'RESUME', 'PAUSE'] } }),
    );
    fireEvent.press(screen.getByTestId('challenge-action-START'));
    fireEvent.press(screen.getByTestId('challenge-action-PAUSE'));
    expect(actions.transition).toHaveBeenNthCalledWith(1, 'START');
    expect(actions.transition).toHaveBeenNthCalledWith(2, 'PAUSE');
    expect(screen.queryByText('mweb.challenge.confirm.CANCEL.title')).toBeNull();
  });

  it.each(['COMPLETE', 'CANCEL', 'ARCHIVE'])(
    'asks before %s and does nothing yet',
    async (action) => {
      const actions = mount(challengeOf({ viewer: { allowed_actions: [action] } }));
      fireEvent.press(screen.getByTestId(`challenge-action-${action}`));
      expect(await screen.findByText(`mweb.challenge.confirm.${action}.title`)).toBeOnTheScreen();
      expect(screen.getByText(`mweb.challenge.confirm.${action}.body|Derby`)).toBeOnTheScreen();
      expect(actions.transition).not.toHaveBeenCalled();
    },
  );

  it('runs the confirmed action and closes the dialog', async () => {
    const actions = mount(challengeOf({ viewer: { allowed_actions: ['COMPLETE'] } }));
    fireEvent.press(screen.getByTestId('challenge-action-COMPLETE'));
    await screen.findByText('mweb.challenge.confirm.COMPLETE.title');
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-transition-confirm-confirm'));
    });
    await waitFor(() => expect(actions.transition).toHaveBeenCalledWith('COMPLETE'));
    await waitFor(() =>
      expect(screen.queryByText('mweb.challenge.confirm.COMPLETE.title')).toBeNull(),
    );
  });

  it('backs out of a confirmation without acting', async () => {
    const actions = mount(challengeOf({ viewer: { allowed_actions: ['CANCEL'] } }));
    fireEvent.press(screen.getByTestId('challenge-action-CANCEL'));
    await screen.findByText('mweb.challenge.confirm.CANCEL.title');
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-transition-confirm-cancel'));
    });
    expect(actions.transition).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('mweb.challenge.confirm.CANCEL.title')).toBeNull(),
    );
  });

  it('disables every action while one is in flight', () => {
    mount(challengeOf(), actionsOf(true));
    expect(screen.getByTestId('challenge-action-START')).toBeDisabled();
    expect(screen.getByTestId('challenge-action-CANCEL')).toBeDisabled();
  });
});

describe('HostChallengeControls — switches', () => {
  it('reflects each switch from the challenge', () => {
    mount();
    expect(screen.getByTestId('challenge-toggle-enabled').props.value).toBe(false);
    expect(screen.getByTestId('challenge-toggle-show_on_pod_details').props.value).toBe(true);
    expect(screen.getByTestId('challenge-toggle-audience_interaction_enabled').props.value).toBe(
      false,
    );
    expect(screen.getByTestId('challenge-toggle-auto_whatsapp').props.value).toBe(true);
    expect(screen.getByTestId('challenge-toggle-auto_email').props.value).toBe(false);
  });

  it('sends the new value when a switch is flipped', () => {
    const actions = mount();
    fireEvent(screen.getByTestId('challenge-toggle-auto_email'), 'valueChange', true);
    fireEvent(screen.getByTestId('challenge-toggle-show_on_pod_details'), 'valueChange', false);
    expect(actions.toggle).toHaveBeenNthCalledWith(1, 'auto_email', true);
    expect(actions.toggle).toHaveBeenNthCalledWith(2, 'show_on_pod_details', false);
  });

  it('pins a live, enabled challenge on until it is paused or ended, and says why', () => {
    mount(challengeOf({ status: 'LIVE', enabled: true }));
    expect(screen.getByTestId('challenge-toggle-enabled').props.disabled).toBe(true);
    expect(screen.getByTestId('challenge-toggle-auto_email').props.disabled).toBe(false);
    expect(screen.getByText('mweb.challenge.pauseBeforeOff')).toBeOnTheScreen();
  });

  it('lets a paused challenge be switched off', () => {
    mount(challengeOf({ status: 'PAUSED', enabled: true }));
    expect(screen.getByTestId('challenge-toggle-enabled').props.disabled).toBe(false);
    expect(screen.queryByText('mweb.challenge.pauseBeforeOff')).toBeNull();
  });

  it('lets a live challenge that is switched off be switched on', () => {
    mount(challengeOf({ status: 'LIVE', enabled: false }));
    expect(screen.getByTestId('challenge-toggle-enabled').props.disabled).toBe(false);
    expect(screen.queryByText('mweb.challenge.pauseBeforeOff')).toBeNull();
  });

  it('disables every switch while an action is in flight', () => {
    mount(challengeOf(), actionsOf(true));
    expect(screen.getByTestId('challenge-toggle-auto_email').props.disabled).toBe(true);
    expect(screen.getByTestId('challenge-toggle-enabled').props.disabled).toBe(true);
  });
});
