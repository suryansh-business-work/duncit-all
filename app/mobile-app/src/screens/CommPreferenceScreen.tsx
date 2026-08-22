import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, YStack } from 'tamagui';
import {
  buildCommPreferenceLabels,
  commChannelSummary,
  COMM_CHANNELS,
  findCommChannel,
  type CommChannel,
} from '@duncit/utils';

import { ChannelLinkCard } from '@/components/comm-preference';
import { ListSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { useCommPreference } from '@/hooks/useCommPreference';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** Channel → the icon it is recognised by. */
const CHANNEL_ICONS: Record<CommChannel, keyof typeof MaterialIcons.glyphMap> = {
  EMAIL: 'mark-email-read',
  WHATSAPP: 'chat',
  SMS: 'sms',
};

/**
 * Communication Preferences — the hub, reached from the single row in Profile
 * Settings and the only place the three channels are listed together. RN twin
 * of mWeb's CommPreferencePage (rule 27).
 *
 * It summarises and navigates; it never writes. That is the whole point of the
 * split: a switch that appears both here and on the channel's own screen is
 * two answers to one question, and the one somebody remembers is whichever
 * they saw last.
 */
export function CommPreferenceScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();

  // A thunk per channel rather than a screen NAME per channel: `navigate`
  // is typed per route, so a union of route names does not narrow and the
  // call would need a cast to compile.
  const open: Record<CommChannel, () => void> = {
    EMAIL: () => navigation.navigate('MailPreference'),
    WHATSAPP: () => navigation.navigate('WhatsAppPreference'),
    SMS: () => navigation.navigate('SmsPreference'),
  };

  const failed = state.loadFailed || !state.preference;
  const body = failed ? (
    <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
      <Text testID="comm-preference-error" color="$muted">
        {labels.loadFailed}
      </Text>
    </YStack>
  ) : (
    <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
      <Text fontSize={12.5} color="$muted">
        {labels.blurb}
      </Text>

      {COMM_CHANNELS.map((channel) => {
        const row = findCommChannel(state.preference?.channels, channel);
        if (!row) return null;
        const copy = labels.channel(channel);
        return (
          <ChannelLinkCard
            key={channel}
            channel={channel}
            icon={CHANNEL_ICONS[channel]}
            name={copy.name}
            hint={copy.hint}
            summary={commChannelSummary(row, labels)}
            onPress={open[channel]}
          />
        );
      })}
    </ScrollView>
  );

  return (
    <StackScreen title={labels.title} testID="comm-preference-screen">
      {/* Three placeholders, matching what is about to arrive — a spinner
          would collapse the screen and shove everything below it. */}
      {state.isLoading ? (
        <YStack padding={16} gap={12} testID="comm-preference-loading">
          <ListSkeleton count={3} />
        </YStack>
      ) : (
        body
      )}
    </StackScreen>
  );
}
