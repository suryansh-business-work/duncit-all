import { Text, YStack } from 'tamagui';

import type { CardLead, SectionModel, TrackingModel } from './overviewTypes';
import { useTranslation } from '@/hooks/useTranslation';
import { DetailCard } from '../parts/DetailCard';
import { DetailRow } from '../parts/DetailRow';
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

/** The kind's overview cards, each a titled list of rows. */
export function OverviewSections({ sections }: Readonly<{ sections: readonly SectionModel[] }>) {
  return (
    <>
      {sections.map((section) => (
        <DetailCard
          key={section.key}
          title={section.title}
          icon={section.icon}
          testID={`lead-overview-${section.key}`}
        >
          {section.rows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
          {section.map ? <MapLink url={section.map.url} /> : null}
        </DetailCard>
      ))}
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
