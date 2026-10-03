import { useMutation, useQuery } from '@apollo/client/react';
import { Divider } from '@mui/material';
import {
  authMessageCardState,
  buildCommPreferenceLabels,
  type CommChannelState,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileSection } from '../ProfileSection';
import { MY_COMM_PREFERENCE, SET_MY_OTP_CHANNEL } from './queries';
import { SectionStatus } from './SectionStatus';
import { SwitchRow } from './SwitchRow';
import { useSwitchSave } from './useSwitchSave';

/**
 * Where sign-in and verification codes may be sent: email, WhatsApp, SMS.
 *
 * The lock rules (the last channel that can carry a code cannot be switched
 * off; a channel with no address cannot be switched on) come from the server
 * sheet and the shared `authMessageCardState`, the same reading mWeb renders.
 */
export function OtpChannelsCard() {
  const { t } = useTranslation();
  const labels = buildCommPreferenceLabels(t);
  const { data, loading, error } = useQuery<{
    myCommunicationPreference: { channels: CommChannelState[] };
  }>(MY_COMM_PREFERENCE, { fetchPolicy: 'cache-and-network' });
  const [setChannel] = useMutation(SET_MY_OTP_CHANNEL);
  const save = useSwitchSave('otpChannel');
  const channels = data?.myCommunicationPreference?.channels ?? null;

  return (
    <ProfileSection
      testId="profile-otp-channels"
      title={t('shell.profile.notifications.codesTitle')}
      description={labels.authBody}
    >
      <SectionStatus
        loading={loading && !channels}
        loadFailed={!!error && !channels}
        loadFailedText={labels.loadFailed}
        saveFailed={save.saveFailed}
        saveFailedText={labels.saveFailed}
        saved={save.saved}
        savedText={labels.saved}
        onDismissSaved={save.dismissSaved}
      />
      {channels?.map((row, index) => {
        const card = authMessageCardState(row, labels);
        return (
          <div key={row.channel}>
            {index > 0 && <Divider />}
            <SwitchRow
              testId={`otp-channel-${row.channel}`}
              label={labels.channel(row.channel).name}
              description={card.note}
              checked={card.checked}
              locked={!card.canToggle}
              busy={save.busyKey === row.channel}
              onChange={(enabled) =>
                save.run(row.channel, () => setChannel({ variables: { channel: row.channel, enabled } }))
              }
            />
          </div>
        );
      })}
    </ProfileSection>
  );
}
