import { ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import {
  authMessageCardState,
  buildCommPreferenceLabels,
  findCommChannel,
  type CommChannel,
} from '@duncit/utils';

import { useCommPreference } from '@/hooks/useCommPreference';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  channel: CommChannel;
}

/**
 * The Authentication messages switch, on the channel's OWN screen. Tamagui
 * twin of mWeb's AuthMessagesCard (rule 27).
 *
 * It used to sit on the shared Communication Preferences list, where the same
 * control appeared three times and none of them were where the rest of that
 * channel's settings were. Here it is the first thing on the channel's screen:
 * one screen, one channel, every switch for it.
 *
 * The card owns its own query rather than taking the sheet as a prop. The
 * mutation answers with the whole sheet — switching one channel off can change
 * whether ANOTHER may still be switched off — so a screen that already loads
 * its categories from a different document has nothing useful to hand down.
 */
export function AuthMessagesCard({ channel }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, primary, danger } = useThemeColors();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();
  const row = findCommChannel(state.preference?.channels, channel);

  // Nothing to show until the sheet lands. A skeleton here would push the
  // categories below it down a beat after the screen had already settled.
  if (!row) return null;

  const card = authMessageCardState(row, labels);
  const busy = state.busyChannel === channel;

  return (
    <YStack gap={8} testID={`auth-messages-${channel}`}>
      {state.saveFailed ? (
        <Text testID={`auth-messages-failed-${channel}`} fontSize={12.5} color={danger}>
          {labels.saveFailed}
        </Text>
      ) : null}

      <XStack
        padding={16}
        borderRadius={18}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
        alignItems="flex-start"
        gap={12}
      >
        <MaterialIcons name="shield" size={20} color={color} />
        <YStack flex={1} gap={2}>
          <Text fontSize={14.5} fontWeight="700" color="$color">
            {card.title}
          </Text>
          <Text fontSize={12.5} color="$muted">
            {card.body}
          </Text>
          <Text fontSize={12} color="$muted">
            {card.note}
          </Text>
        </YStack>
        {busy ? <ActivityIndicator testID={`auth-messages-busy-${channel}`} color={primary} /> : null}
        {!busy && card.showSwitch ? (
          <Switch
            testID={`auth-messages-switch-${channel}`}
            aria-label={card.title}
            value={card.checked}
            disabled={!card.canToggle}
            onValueChange={(next) => {
              state.setOtpChannel(channel, next).catch(() => {
                /* reported through state.saveFailed */
              });
            }}
            trackColor={{ true: primary }}
          />
        ) : null}
      </XStack>
    </YStack>
  );
}
