import { ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { commRowState, type CommChannelLabels, type CommChannelState } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  icon: keyof typeof MaterialIcons.glyphMap;
  labels: CommChannelLabels;
  state: CommChannelState;
  otpLabel: string;
  otpLockedHint: string;
  busy: boolean;
  /** Opens this channel's own categories screen. */
  onOpen: () => void;
  onToggleOtp: (enabled: boolean) => void;
}

/**
 * One channel in Communication Preferences — Tamagui twin of mWeb's
 * ChannelPreferenceCard (rule 27).
 *
 * The row that navigates and the row with the switch are separate press
 * targets on purpose: a switch nested inside a pressable card looks
 * interactive and only navigates.
 */
export function ChannelPreferenceCard({
  icon,
  labels,
  state,
  otpLabel,
  otpLockedHint,
  busy,
  onOpen,
  onToggleOtp,
}: Readonly<Props>) {
  const { color, muted, primary } = useThemeColors();
  const row = commRowState(state);
  const caption = row.locked ? otpLockedHint : state.destination;

  return (
    <YStack
      testID={`comm-channel-${state.channel}`}
      borderRadius={18}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
    >
      <XStack
        testID={`comm-channel-open-${state.channel}`}
        role="button"
        aria-label={labels.name}
        onPress={onOpen}
        paddingHorizontal={16}
        paddingVertical={14}
        alignItems="center"
        gap={12}
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name={icon} size={20} color={color} />
        <YStack flex={1}>
          <Text fontSize={14.5} fontWeight="700" color="$color">
            {labels.name}
          </Text>
          <Text fontSize={12.5} fontWeight="700" color="$muted">
            {labels.hint}
          </Text>
        </YStack>
        <MaterialIcons name="chevron-right" size={22} color={muted} />
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      <XStack
        paddingHorizontal={16}
        paddingVertical={10}
        alignItems="center"
        gap={12}
        minHeight={56}
      >
        <YStack flex={1}>
          <Text fontSize={13.5} fontWeight="700" color="$color">
            {otpLabel}
          </Text>
          {/* Nothing to send to: say so where the switch would have been,
              rather than offering one that cannot move. */}
          <Text fontSize={12} color="$muted" numberOfLines={2}>
            {row.unreachable ? labels.missing : caption}
          </Text>
        </YStack>
        {busy ? <ActivityIndicator testID={`comm-busy-${state.channel}`} color={primary} /> : null}
        {!busy && !row.unreachable ? (
          <Switch
            testID={`comm-switch-${state.channel}`}
            aria-label={`${otpLabel} ${labels.name}`}
            value={state.otp_enabled}
            disabled={!row.canToggle}
            onValueChange={onToggleOtp}
            trackColor={{ true: primary }}
          />
        ) : null}
      </XStack>
    </YStack>
  );
}
