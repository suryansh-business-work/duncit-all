import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { SurveyKind } from '@/graphql/onboarding-survey';
import { useMyMeeting } from '@/hooks/useMyMeeting';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDateTime } from '@/utils/date-format';

/**
 * The signed-in user's onboarding meeting for a kind — scheduled time + a join
 * link once onboarding staff set them (synced from the Onboarding portal).
 * Renders nothing when the user has no meeting for this kind. RN twin of mWeb's
 * MeetingStatusCard.
 */
export function MeetingStatusCard({ kind }: Readonly<{ kind: SurveyKind }>) {
  const { meeting } = useMyMeeting(kind);
  const { primary } = useThemeColors();
  if (!meeting) return null;

  const label = kind === 'VENUE' ? 'Venue' : 'Host';
  const scheduled =
    meeting.status === 'SCHEDULED' && !!(meeting.scheduled_at || meeting.meeting_link);

  return (
    <YStack
      testID={`meeting-card-${kind}`}
      gap={8}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="event-available" size={18} color={primary} />
        <Text flex={1} fontSize={14} fontWeight="900" color="$color">
          Your {label} onboarding meeting
        </Text>
        <Text fontSize={11} fontWeight="800" color="$muted">
          {meeting.status}
        </Text>
      </XStack>

      {meeting.request_no ? (
        <Text testID={`meeting-request-no-${kind}`} fontSize={12} fontWeight="800" color="$muted">
          Request ID: {meeting.request_no}
        </Text>
      ) : null}

      {scheduled ? (
        <>
          {meeting.scheduled_at ? (
            <Text fontSize={13} color="$color">
              Scheduled for {formatDateTime(meeting.scheduled_at)}
            </Text>
          ) : null}
          {meeting.meeting_link ? (
            <XStack
              testID={`meeting-join-${kind}`}
              role="button"
              aria-label="Join meeting"
              onPress={() => void Linking.openURL(meeting.meeting_link as string)}
              alignSelf="flex-start"
              paddingHorizontal={14}
              paddingVertical={9}
              borderRadius={999}
              backgroundColor="$primary"
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13} fontWeight="900" color="$onPrimary">
                Join meeting
              </Text>
            </XStack>
          ) : null}
        </>
      ) : (
        <Text fontSize={12.5} color="$muted">
          Requested — our onboarding team will confirm a time soon.
        </Text>
      )}
    </YStack>
  );
}
