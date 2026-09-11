import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PodThumb } from '@/components/host-manage/PodThumb';
import {
  ApprovalPill,
  OverflowButton,
  TypePill,
  WarningNote,
} from '@/components/host-manage/HostRowParts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenueApprovalChip } from '@/utils/venue-approval';
import { PRESS_STYLE } from '@duncit/buttons-native';

type FactIcon = 'place' | 'schedule-send' | 'event-available';

interface FactProps {
  icon: FactIcon;
  label: string;
  value: string;
  /** Resolved once by the row — @expo/vector-icons takes a colour string. */
  tint: string;
}

/** One labelled fact on the row — the venue, and the two dates. */
function RequestFact({ icon, label, value, tint }: Readonly<FactProps>) {
  return (
    <XStack alignItems="center" gap={6}>
      <MaterialIcons name={icon} size={14} color={tint} />
      <Text fontSize={12} color="$muted" numberOfLines={1} flex={1}>
        {label}:{' '}
        <Text fontSize={12} fontWeight="600" color="$color">
          {value}
        </Text>
      </Text>
    </XStack>
  );
}

interface Props {
  id: string;
  title: string;
  typeLabel: string;
  /** Free pods wear the success-toned pill, paid ones the primary one. */
  free?: boolean;
  /** The pod's first still, or undefined for the glyph placeholder. */
  cover?: string;
  /** The venue the slot was asked for. */
  venueName: string;
  /** When the host sent the request. */
  requestedOn: string;
  /** When the pod itself is scheduled to run. */
  eventDate: string;
  /** Venue-approval chip meta (computed once by the section — rule 26g). */
  approval: VenueApprovalChip | null;
  /** Rejection note shown under a Venue Rejected pod. */
  rejectedNote: string | null;
  onOpen: () => void;
  onActions: () => void;
}

/**
 * A pod whose venue has not answered yet — or has refused. It carries the
 * request's own facts (which venue, when it was asked for, which event date)
 * that Your pods has no room for, and keeps the same actions sheet so the host
 * can still edit, resubmit or cancel from here. mWeb twin (rule 27).
 */
export function VenueRequestRow({
  id,
  title,
  typeLabel,
  free = false,
  cover,
  venueName,
  requestedOn,
  eventDate,
  approval,
  rejectedNote,
  onOpen,
  onActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();

  return (
    <YStack gap={10} paddingHorizontal={16} paddingVertical={14}>
      <XStack alignItems="flex-start" gap={8}>
        <XStack
          testID={`venue-request-open-${id}`}
          role="button"
          aria-label={t('mweb.common.openPod')}
          onPress={onOpen}
          flex={1}
          alignItems="flex-start"
          gap={12}
          pressStyle={PRESS_STYLE.row}
        >
          <PodThumb uri={cover} />
          <YStack flex={1} gap={2}>
            <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
              {title}
            </Text>
            <RequestFact
              icon="place"
              label={t('mweb.common.venue')}
              value={venueName}
              tint={muted}
            />
            <RequestFact
              icon="schedule-send"
              label={t('mweb.hostManage.requestedOn')}
              value={requestedOn}
              tint={muted}
            />
            <RequestFact
              icon="event-available"
              label={t('mweb.hostManage.eventDate')}
              value={eventDate}
              tint={muted}
            />
            {approval ? (
              <YStack paddingTop={4}>
                <ApprovalPill approval={approval} testID={`venue-request-approval-${id}`} />
              </YStack>
            ) : null}
          </YStack>
        </XStack>
        <TypePill label={typeLabel} free={free} />
        <OverflowButton
          testID={`venue-request-actions-${id}`}
          label={t('mweb.hostManage.podActions')}
          onPress={onActions}
        />
      </XStack>

      {rejectedNote ? (
        <WarningNote testID={`venue-request-note-${id}`} text={rejectedNote} />
      ) : null}
    </YStack>
  );
}
