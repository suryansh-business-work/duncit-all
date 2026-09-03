import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AttendeeAvatar } from '@/components/attendance/AttendeeAvatar';
import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { VenuePodAttendeeProfilesDocument } from '@/graphql/venue-pods';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { asVenuePodRow, bucketLabelKey, podPriceLabel, type StudioPod } from './studio-pods';
import { cancelDisabledText } from './venue-cancel-pod.form';

type AttendeeProfile = ResultOf<
  typeof VenuePodAttendeeProfilesDocument
>['publicUsersByIds'][number];

/** One labelled line of the pod's facts. */
function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between" gap={12} paddingVertical={4}>
      <Text fontSize={12.5} color="$muted">
        {label}
      </Text>
      <Text flex={1} fontSize={13} fontWeight="600" color="$color" textAlign="right">
        {value}
      </Text>
    </XStack>
  );
}

/** The people behind the pod's attendee ids — fetched while the sheet is open. */
function useAttendeeProfiles(pod: StudioPod | null) {
  const [profiles, setProfiles] = useState<AttendeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (!pod || pod.pod_attendees.length === 0) {
      setProfiles([]);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    graphqlRequest(
      VenuePodAttendeeProfilesDocument,
      { ids: [...pod.pod_attendees] },
      { auth: true },
    )
      .then((data) => active && setProfiles(data.publicUsersByIds))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [pod]);
  return { profiles, isLoading };
}

interface Props {
  pod: StudioPod | null;
  currencySymbol: string | null;
  onClose: () => void;
}

/** Basic pod info + who is coming, for the venue owner's tap-through — the
 * Tamagui twin of the Partners console's detail dialog (rule 27). */
export function VenuePodDetailSheet({ pod, currencySymbol, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { profiles, isLoading } = useAttendeeProfiles(pod);
  const disabledReason = pod ? cancelDisabledText(asVenuePodRow(pod), t) : null;

  const footer = (
    <DuncitButton
      testID="venue-pod-detail-close"
      label={t('mweb.common.close')}
      onPress={onClose}
      variant="outline"
      tone="neutral"
      fullWidth
    />
  );

  return (
    <DuncitDialog
      open={!!pod}
      onClose={onClose}
      testID="venue-pod-detail"
      title={pod?.pod_title ?? t('mweb.venuePods.podDetails')}
      subtitle={pod ? t(bucketLabelKey(pod.bucket)) : undefined}
      closeLabel={t('mweb.common.close')}
      footer={footer}
    >
      {pod ? (
        <YStack gap={6}>
          <DetailRow label={t('mweb.venuePods.venue')} value={pod.owner_name} />
          <DetailRow
            label={t('mweb.venuePods.hosts')}
            value={pod.host_names.filter(Boolean).join(', ') || t('mweb.studioPods.hostsNone')}
          />
          <DetailRow label={t('mweb.venuePods.when')} value={formatDateTime(pod.pod_date_time)} />
          <DetailRow
            label={t('mweb.venuePods.spots')}
            value={`${pod.attendee_count} / ${pod.no_of_spots}`}
          />
          <DetailRow
            label={t('mweb.venuePods.price')}
            value={podPriceLabel(pod, t, currencySymbol)}
          />
          {disabledReason ? (
            <Text testID="venue-pod-detail-locked" fontSize={12} color="$muted">
              {disabledReason}
            </Text>
          ) : null}
          <Text fontSize={13.5} fontWeight="700" color="$color" paddingTop={8}>
            {t('mweb.venuePods.attendees')}
          </Text>
          {isLoading ? <Spinner color="$primary" /> : null}
          {pod.pod_attendees.length === 0 ? (
            <Text testID="venue-pod-detail-no-attendees" fontSize={12.5} color="$muted">
              {t('mweb.venuePods.noAttendees')}
            </Text>
          ) : null}
          {profiles.map((person) => (
            <XStack key={person.user_id} alignItems="center" gap={10} paddingVertical={4}>
              <AttendeeAvatar
                uri={person.profile_photo ?? ''}
                name={person.full_name ?? ''}
                size={30}
              />
              <Text fontSize={13} fontWeight="600" color="$color">
                {person.full_name ?? '—'}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : null}
    </DuncitDialog>
  );
}
