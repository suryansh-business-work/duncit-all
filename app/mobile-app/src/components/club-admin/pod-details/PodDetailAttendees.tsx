import { Avatar, AvatarImage, Text, XStack, YStack } from 'tamagui';
import type { StatusTone } from '@duncit/utils';

import type { ClubPodAttendee } from '@/hooks/useClubPodDetail';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { ToneChip } from '../ToneChip';
import { useToneColors } from '../tone';
import { attendeeStatus } from './attendee-status';
import { PodDetailSection } from './PodDetailSection';

interface RowProps {
  row: ClubPodAttendee;
  statusLabel: string;
  /** Resolved chip colour — computed in the parent so every row reads one map. */
  statusColor: string;
  /** `joined_at`, already in the admin's date/time settings (rule 11). */
  joined: string;
  /** A hairline above every row but the first. */
  divided: boolean;
  t: Translate;
}

/** One person on the pod: who they are, what their booking is doing, how many
 * seats it holds and how to reach them. */
function AttendeeLine({ row, statusLabel, statusColor, joined, divided, t }: Readonly<RowProps>) {
  const struck = row.status === 'BACKED_OUT';
  const name = row.full_name ?? '';
  const contact = [row.email, row.phone].filter(Boolean).join(' · ');
  const testID = `club-pod-detail-attendee-${row.member_id ?? row.user_id}`;
  const seats = `${t('podDetailsPanel.podAttendeesSection.seats')}: ${row.seats}`;

  return (
    <XStack
      alignItems="flex-start"
      gap={12}
      paddingVertical={10}
      borderTopWidth={divided ? 1 : 0}
      borderTopColor="$borderColor"
      testID={testID}
    >
      <Avatar circular size={36}>
        <AvatarImage accessibilityLabel={name} src={row.profile_photo ?? undefined} />
      </Avatar>
      <YStack flex={1} gap={4}>
        <XStack alignItems="center" gap={8} flexWrap="wrap">
          <Text
            fontSize={14}
            fontWeight="600"
            color={struck ? '$muted' : '$color'}
            textDecorationLine={struck ? 'line-through' : 'none'}
            numberOfLines={1}
          >
            {name}
          </Text>
          <ToneChip testID={`${testID}-status`} label={statusLabel} color={statusColor} />
        </XStack>
        {row.replaced_by_name ? (
          <Text testID={`${testID}-replaced`} fontSize={12} color="$warning">
            {t('podDetailsPanel.podAttendeesSection.spotFilledBy', {
              vars: { name: row.replaced_by_name },
            })}
          </Text>
        ) : null}
        {contact ? (
          <Text fontSize={12} color="$muted" numberOfLines={2}>
            {contact}
          </Text>
        ) : null}
        <Text fontSize={12} color="$muted">
          {[seats, joined].filter(Boolean).join(' · ')}
        </Text>
      </YStack>
    </XStack>
  );
}

interface Props {
  rows: readonly ClubPodAttendee[];
  podDateTime: string | null | undefined;
  isLoading: boolean;
}

/**
 * Everyone on the pod, with contacts.
 *
 * Read-only, exactly as `@duncit/pod-details`' `PodAttendeesSection` is (rule
 * 27): marking somebody present is the write the host's payout is computed
 * from, and it lives behind the attendance board's own warnings — never a tap
 * on a roster row.
 */
export function PodDetailAttendees({ rows, podDateTime, isLoading }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const tones: Record<StatusTone, string> = useToneColors();
  const empty =
    !isLoading && rows.length === 0 ? t('podDetailsPanel.podAttendeesSection.nobodyJoined') : null;

  return (
    <PodDetailSection
      title={t('podDetailsPanel.podAttendeesSection.attendees')}
      testID="club-pod-detail-attendees"
      badge={rows.length}
      isLoading={isLoading && rows.length === 0}
      emptyText={empty}
    >
      {rows.map((row, index) => {
        const status = attendeeStatus(row, podDateTime, t);
        return (
          <AttendeeLine
            key={row.member_id ?? row.user_id}
            row={row}
            statusLabel={status.label}
            statusColor={tones[status.tone]}
            joined={row.joined_at ? formatDateTime(row.joined_at) : ''}
            divided={index > 0}
            t={t}
          />
        );
      })}
    </PodDetailSection>
  );
}
