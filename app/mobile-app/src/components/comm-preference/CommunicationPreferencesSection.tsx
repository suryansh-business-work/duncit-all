import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { buildCommPreferenceLabels, type CommChannel } from '@duncit/utils';

import { ListSkeleton } from '@/components/Skeleton';
import { useCommPreference } from '@/hooks/useCommPreference';
import { useTranslation } from '@/hooks/useTranslation';
import { ChannelPreferenceCard } from './ChannelPreferenceCard';

/** Channel → its icon. The screen it opens is the caller's to decide, because
 * only the caller holds the navigator. */
const ICONS: Record<CommChannel, keyof typeof MaterialIcons.glyphMap> = {
  EMAIL: 'mark-email-read',
  WHATSAPP: 'chat',
  SMS: 'sms',
};

interface Props {
  onOpenChannel: (channel: CommChannel) => void;
}

/**
 * Profile Settings → Communication Preferences. Tamagui twin of mWeb's
 * CommunicationPreferencesSection (rule 27).
 *
 * Three channels under one heading, each a door to its own categories plus the
 * one-time-code switch inline. The switch is here rather than behind the door
 * because it is the same question on all three — "where do my codes go?" — and
 * it is only answerable by seeing all three at once: the server refuses to let
 * the last reachable one be switched off, and that refusal makes no sense on a
 * screen showing one channel.
 */
export function CommunicationPreferencesSection({ onOpenChannel }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();

  const heading = (
    <YStack gap={2}>
      <Text fontSize={15} fontWeight="800" color="$color">
        {labels.title}
      </Text>
      <Text fontSize={12.5} color="$muted">
        {labels.subtitle}
      </Text>
    </YStack>
  );

  if (state.isLoading) {
    return (
      <YStack gap={12} testID="comm-preference-loading">
        {heading}
        {/* Three placeholders, matching what is about to arrive — a spinner
            would collapse the section and shove everything below it. */}
        <ListSkeleton count={3} />
      </YStack>
    );
  }

  if (state.loadFailed || !state.preference) {
    return (
      <YStack gap={12}>
        {heading}
        <Text testID="comm-preference-error" fontSize={13} color="$muted">
          {labels.loadFailed}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={12} testID="comm-preference-section">
      {heading}
      {state.saveFailed ? (
        <Text testID="comm-preference-save-failed" fontSize={12.5} color="$red10">
          {labels.saveFailed}
        </Text>
      ) : null}

      {state.preference.channels.map((row) => (
        <ChannelPreferenceCard
          key={row.channel}
          icon={ICONS[row.channel]}
          labels={labels.channel(row.channel)}
          state={row}
          otpLabel={labels.otpLabel}
          otpLockedHint={labels.otpLocked}
          busy={state.busyChannel === row.channel}
          onOpen={() => onOpenChannel(row.channel)}
          onToggleOtp={(enabled) => {
            state.setOtpChannel(row.channel, enabled).catch(() => {
              /* reported through state.saveFailed */
            });
          }}
        />
      ))}
    </YStack>
  );
}
