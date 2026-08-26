import { Text, XStack, YStack } from 'tamagui';
import {
  CONTACT_CHANNELS,
  currentContactValue,
  type ContactChangeLabels,
  type ContactChannel,
  type ContactSnapshot,
} from '@duncit/utils';

interface RowProps {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  value: string;
  onChange: (channel: ContactChannel) => void;
}

/**
 * One contact detail: what it is, what it currently is, and the way to move it.
 * Tamagui twin of mWeb's ContactRow.
 *
 * Read-only on purpose. These three are the only profile fields whose change
 * has to be proved, so they are not boxes that quietly disagree with the
 * account until Save is pressed — each is the value the account actually holds,
 * with the one door that can change it beside it.
 */
function ContactRow({ channel, labels, value, onChange }: Readonly<RowProps>) {
  const copy = labels.channel(channel);
  const action = value ? labels.changeAction : labels.addAction;
  return (
    <XStack gap={12} alignItems="center" paddingVertical={8}>
      <YStack flex={1} gap={2}>
        <Text fontSize={12} color="$muted">
          {copy.name}
        </Text>
        <Text fontSize={14} color={value ? '$color' : '$muted'} numberOfLines={1}>
          {value || copy.emptyValue}
        </Text>
      </YStack>
      <XStack
        testID={`contact-change-${channel}`}
        role="button"
        aria-label={`${action} ${copy.name}`}
        onPress={() => onChange(channel)}
        height={36}
        paddingHorizontal={14}
        alignItems="center"
        justifyContent="center"
        borderRadius={10}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={{ opacity: 0.85 }}
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
      {CONTACT_CHANNELS.map((channel) => (
        <ContactRow
          key={channel}
          channel={channel}
          labels={labels}
          value={currentContactValue(snapshot, channel)}
          onChange={onChange}
        />
      ))}
    </YStack>
  );
}
