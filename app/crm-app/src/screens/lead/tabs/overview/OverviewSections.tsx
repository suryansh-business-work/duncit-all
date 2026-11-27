import { Text, YStack } from 'tamagui';

import type { CardLead, SectionModel, TrackingModel } from './overviewTypes';
import { useTranslation } from '@/hooks/useTranslation';
import { DetailCard } from '../parts/DetailCard';
import { DetailRow, isEmptyValue } from '../parts/DetailRow';
import { LinkText } from '../parts/LinkText';

/** The venue's map: the Google Maps link for its address, or a nudge to add one. */
function MapLink({ url }: Readonly<{ url: string | null }>) {
  const { t } = useTranslation();
  if (!url) {
    return (
      <Text color="$muted" testID="lead-map-empty">
        {t('crm.leadDetail.mapEmpty')}
      </Text>
    );
  }
  return <LinkText href={url} label={t('crm.leadDetail.openInMaps')} testID="lead-map-link" />;
}

/**
 * The kind's overview cards, each a titled list of rows. Only filled fields
 * get a row; the empty ones are named on one muted line under them, so a new
 * lead is not a page of dashes (Edit in the header fills them in).
 */
export function OverviewSections({ sections }: Readonly<{ sections: readonly SectionModel[] }>) {
  const { t } = useTranslation();
  return (
    <>
      {sections.map((section) => {
        const filled = section.rows.filter((row) => !isEmptyValue(row.value));
        const empty = section.rows.filter((row) => isEmptyValue(row.value));
        return (
          <DetailCard
            key={section.key}
            title={section.title}
            icon={section.icon}
            testID={`lead-overview-card-${section.key}`}
          >
            {filled.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
            {empty.length > 0 ? (
              <Text color="$muted" fontSize="$2" testID={`lead-overview-empty-${section.key}`}>
                {t('crmApp.mobile.notFilled', {
                  vars: { fields: empty.map((row) => row.label).join(', ') },
                })}
              </Text>
            ) : null}
            {section.map ? <MapLink url={section.map.url} /> : null}
          </DetailCard>
        );
      })}
    </>
  );
}

/** The portal's Lead tracking card: source, owner, follow-up, created / updated and the note. */
export function TrackingCard({
  tracking,
  lead,
  followUp,
}: Readonly<{ tracking: TrackingModel; lead: CardLead; followUp: string }>) {
  const { t } = useTranslation();
  return (
    <DetailCard
      title={t('crm.prospectLeads.leadTracking')}
      icon="sticky-note-2"
      testID="lead-overview-tracking"
    >
      <DetailRow label={t('crm.common.source')} value={tracking.source} />
      <DetailRow label={t('crm.common.assignedTo')} value={lead.assigned_to} />
      <DetailRow label={tracking.followUpLabel} value={followUp} />
      <YStack height={1} backgroundColor="$borderColor" marginVertical="$1" />
      <DetailRow label={t('shell.common.created')} value={tracking.created} />
      <DetailRow label={t('shell.common.updated')} value={tracking.updated} />
      {tracking.note ? (
        <YStack gap="$1" paddingTop="$1" testID="lead-overview-note">
          <YStack height={1} backgroundColor="$borderColor" marginBottom="$1" />
          <Text color="$muted" fontSize="$1" fontWeight="700" letterSpacing={0.4}>
            {tracking.note.caption}
          </Text>
          <Text>{tracking.note.text}</Text>
        </YStack>
      ) : null}
    </DetailCard>
  );
}
