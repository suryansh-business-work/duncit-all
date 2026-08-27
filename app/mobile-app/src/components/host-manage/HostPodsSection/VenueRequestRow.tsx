import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

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

/** One labelled fact on the card — the venue, and the two dates. */
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
  venueName,
  requestedOn,
  eventDate,
  approval,
  rejectedNote,
  onOpen,
  onActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, muted } = useThemeColors();
  const rejected = approval?.tone === 'error';

  return (
    <YStack
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor={rejected ? '$danger' : semantic.warning}
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <YStack
          testID={`venue-request-open-${id}`}
          role="button"
          aria-label={t('mweb.common.openPod')}
          onPress={onOpen}
          flex={1}
          gap={2}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
            {title}
          </Text>
          <Text fontSize={12} color="$muted" numberOfLines={1}>
            {typeLabel}
          </Text>
        </YStack>
        <XStack
          testID={`venue-request-actions-${id}`}
          role="button"
          aria-label={t('mweb.hostManage.podActions')}
          onPress={onActions}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="more-vert" size={18} color={ink} />
        </XStack>
      </XStack>

      <RequestFact icon="place" label={t('mweb.common.venue')} value={venueName} tint={muted} />
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
        <Text
          testID={`venue-request-approval-${id}`}
          fontSize={11.5}
          fontWeight="700"
          color={rejected ? '$danger' : semantic.warning}
          numberOfLines={1}
        >
          {approval.label}
        </Text>
      ) : null}

      {rejectedNote ? (
        <XStack testID={`venue-request-note-${id}`} alignItems="flex-start" gap={6}>
          <MaterialIcons name="info-outline" size={16} color={semantic.warning} />
          <Text flex={1} fontSize={12} color="$muted">
            {rejectedNote}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
