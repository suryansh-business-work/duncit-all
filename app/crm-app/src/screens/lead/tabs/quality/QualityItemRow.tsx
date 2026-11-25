import { Text, XStack, YStack } from 'tamagui';
import {
  CRM_AUTO_CHECK_KEY,
  CRM_QUALITY_STATUS_KEY,
  CRM_QUALITY_STATUS_TONE,
  CRM_VIA_KEY,
  crmFormatPoints,
  crmKeyOr,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import { DetailRow } from '../parts/DetailRow';
import type { QualityEvidence, QualityItem } from './useLeadQuality';

/** The decision behind one item: what proves it, the source, notes, and who decided it how and when. */
function ItemEvidence({ evidence }: Readonly<{ evidence: QualityEvidence | undefined }>) {
  const { t } = useTranslation();
  if (!evidence) {
    return (
      <Text color="$muted" fontSize="$2">
        {t('crm.leadQualityTab.noEvidence')}
      </Text>
    );
  }
  return (
    <YStack
      paddingLeft="$3"
      borderLeftWidth={2}
      borderColor="$borderColor"
      testID="lead-quality-evidence"
    >
      <DetailRow label={t('crm.leadQualityTab.evidence')} value={evidence.evidence} />
      <DetailRow
        label={t('crm.leadQualityTab.source')}
        value={evidence.source_url ? { href: evidence.source_url } : ''}
      />
      {evidence.notes ? (
        <DetailRow label={t('crm.leadQualityTab.notes')} value={evidence.notes} />
      ) : null}
      <Text color="$muted" fontSize="$2">
        {t('crm.leadQualityTab.decidedBy', {
          vars: {
            via: t(crmKeyOr(CRM_VIA_KEY, evidence.via, 'crm.leadQuality.viaManual')),
            name: evidence.actor.name,
            date: displayDateTime(evidence.decided_at),
          },
        })}
      </Text>
    </YStack>
  );
}

interface Props {
  item: QualityItem;
  evidence: QualityEvidence | undefined;
  onRecord: (item: QualityItem) => void;
}

/** One item of an opened criterion: points, status, how it is checked, its evidence and Record evidence. */
export function QualityItemRow({ item, evidence, onRecord }: Readonly<Props>) {
  const { t } = useTranslation();
  const check = t(crmKeyOr(CRM_AUTO_CHECK_KEY, item.auto_check, 'crm.leadQuality.autoNone'));
  return (
    <YStack
      gap="$1.5"
      paddingTop="$2"
      borderTopWidth={1}
      borderColor="$borderColor"
      testID={`lead-quality-item-${item.key}`}
    >
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text fontWeight="600" flexShrink={1}>
          {item.name}
        </Text>
        {item.mandatory ? <ToneChip label={t('crm.leadQualityTab.gate')} tone="default" /> : null}
        <ToneChip
          label={t(crmKeyOr(CRM_QUALITY_STATUS_KEY, item.status, 'crm.leadQuality.statusPending'))}
          tone={CRM_QUALITY_STATUS_TONE[item.status] ?? 'default'}
        />
      </XStack>
      <Text color="$muted" fontSize="$2">
        {t('crm.leadQualityTab.itemPoints', {
          vars: { earned: crmFormatPoints(item.earned), points: crmFormatPoints(item.points) },
        })}
      </Text>
      <Text color="$muted" fontSize="$2">
        {item.threshold == null
          ? check
          : `${check} · ${t('crm.leadQualityTab.threshold', { vars: { value: item.threshold } })}`}
      </Text>
      {item.guidance ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.leadQualityTab.guidance', { vars: { text: item.guidance } })}
        </Text>
      ) : null}
      <ItemEvidence evidence={evidence} />
      <XStack>
        <DuncitButton
          label={t('crm.leadQualityTab.recordEvidence')}
          accessibilityLabel={t('crm.leadQualityTab.recordEvidenceFor', {
            vars: { name: item.name },
          })}
          onPress={() => onRecord(item)}
          variant="outline"
          size="sm"
          testID={`lead-quality-record-${item.key}`}
        />
      </XStack>
    </YStack>
  );
}
