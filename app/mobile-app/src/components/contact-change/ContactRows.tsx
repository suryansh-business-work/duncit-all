import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import {
  CONTACT_CHANNELS,
  contactValueVerified,
  currentContactValue,
  type ContactChangeLabels,
  type ContactChannel,
  type ContactSnapshot,
} from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface RowProps {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  value: string;
  /** A one-time code proved this number (`contactValueVerified`). */
  verified: boolean;
  onChange: (channel: ContactChannel) => void;
}

/** The tick beside a proved number — worded, so it never rests on colour alone. */
function VerifiedBadge({ channel, label }: Readonly<{ channel: ContactChannel; label: string }>) {
  const { success } = useThemeColors();
  return (
    <XStack
      testID={`contact-change-${channel}-verified`}
      alignItems="center"
      gap={3}
      flexShrink={0}
    >
      <MaterialIcons
        name="check-circle"
        size={16}
        color={success}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text fontSize={12} fontWeight="600" color="$success">
        {label}
      </Text>
    </XStack>
  );
}

/**
 * One contact detail: what it is, what it currently is, and the way to move it.
 * Tamagui twin of mWeb's ContactRow.
 *
 * Read-only on purpose. These three are the only profile fields whose change
 * has to be proved, so they are not boxes that quietly disagree with the
 * account until Save is pressed — each is the value the account actually holds,
 * with the one door that can change it beside it.
 *
 * All three are required: a missing one is marked with the same asterisk the
 * form's required boxes carry, and its empty line is coloured as the error it
 * is rather than greyed out like an optional blank.
 */
function ContactRow({ channel, labels, value, verified, onChange }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const action = value ? labels.changeAction : labels.addAction;
  return (
    <XStack gap={12} alignItems="center" paddingVertical={10}>
      <YStack flex={1} gap={2}>
        <Text fontSize={12} color="$muted">
          {copy.name} <Text color="$danger">*</Text>
        </Text>
        <XStack alignItems="center" gap={6}>
          <Text fontSize={15} color={value ? '$color' : '$danger'} numberOfLines={1} flexShrink={1}>
            {value || copy.emptyValue}
          </Text>
          {verified ? <VerifiedBadge channel={channel} label={labels.verified} /> : null}
        </XStack>
      </YStack>
      <XStack
        testID={`contact-change-${channel}`}
        role="button"
        aria-label={t('mweb.a11y.actionFor', { vars: { action, name: copy.name } })}
        tabIndex={0}
        hitSlop={4}
        onPress={() => onChange(channel)}
        height={36}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$soft"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={13} fontWeight="600" color="$color">
          {action}
        </Text>
      </XStack>
    </XStack>
  );
}

interface Props {
  labels: ContactChangeLabels;
  snapshot: ContactSnapshot;
  onChange: (channel: ContactChannel) => void;
}

/** The three contact rows, in the one order both apps list them in. */
export function ContactRows({ labels, snapshot, onChange }: Readonly<Props>) {
  return (
    <YStack>
      {CONTACT_CHANNELS.map((channel, index) => (
        <YStack key={channel}>
          {index > 0 ? <YStack height={1} backgroundColor="$borderColor" /> : null}
          <ContactRow
            channel={channel}
            labels={labels}
            value={currentContactValue(snapshot, channel)}
            verified={contactValueVerified(snapshot, channel)}
            onChange={onChange}
          />
        </YStack>
      ))}
    </YStack>
  );
}
