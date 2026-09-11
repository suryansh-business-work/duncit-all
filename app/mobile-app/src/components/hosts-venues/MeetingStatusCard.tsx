import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { SurveyKind } from '@/graphql/onboarding-survey';
import { useMyMeeting } from '@/hooks/useMyMeeting';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDateTime } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * The signed-in user's onboarding meeting for a kind — scheduled time + a join
 * link once onboarding staff set them (synced from the Onboarding portal).
 * Renders nothing when the user has no meeting for this kind. RN twin of mWeb's
 * MeetingStatusCard.
 */
export function MeetingStatusCard({ kind }: Readonly<{ kind: SurveyKind }>) {
  const { t } = useTranslation();
  const { meeting } = useMyMeeting(kind);
  const { accent } = useThemeColors();
  if (!meeting) return null;

  const label = kind === 'VENUE' ? 'Venue' : 'Host';
  const scheduled =
    meeting.status === 'SCHEDULED' && !!(meeting.scheduled_at || meeting.meeting_link);

  return (
    <SurfaceCard testID={`meeting-card-${kind}`} gap={8}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="event-available" size={18} color={accent} />
        <Text flex={1} fontSize={16} fontWeight="600" color="$color">
          Your {label} onboarding meeting
        </Text>
        <XStack
          height={24}
          paddingHorizontal={10}
          borderRadius={999}
          alignItems="center"
          backgroundColor={scheduled ? '$success' : '$soft'}
        >
          <Text fontSize={11} fontWeight="600" color={scheduled ? '$onPrimary' : '$color'}>
            {meeting.status}
          </Text>
        </XStack>
      </XStack>

      {meeting.request_no ? (
        <Text testID={`meeting-request-no-${kind}`} fontSize={12} fontWeight="600" color="$muted">
          Request ID: {meeting.request_no}
        </Text>
      ) : null}

      {scheduled ? (
        <>
          {meeting.scheduled_at ? (
            <Text fontSize={14} color="$color">
              Scheduled for {formatDateTime(meeting.scheduled_at)}
            </Text>
          ) : null}
          {meeting.meeting_link ? (
            <XStack
              testID={`meeting-join-${kind}`}
              role="button"
              aria-label={t('mweb.hostsVenues.joinMeeting')}
              onPress={() => Linking.openURL(meeting.meeting_link as string)}
              alignSelf="flex-start"
              height={44}
              alignItems="center"
              paddingHorizontal={20}
              borderRadius={999}
              backgroundColor="$primary"
              pressStyle={PRESS_STYLE.solid}
            >
              <Text fontSize={14} fontWeight="600" color="$onPrimary">
                Join meeting
              </Text>
            </XStack>
          ) : null}
        </>
      ) : (
        <Text fontSize={13} color="$muted">
          Requested — our onboarding team will confirm a time soon.
        </Text>
      )}
    </SurfaceCard>
  );
}
