import { useMemo, useState } from 'react';
import { Text, YStack } from 'tamagui';
import { crmEvidenceByKey, crmItemNamesOf } from '@duncit/utils';

import { StateView } from '@/components/StateView';
import type { LeadTabProps } from './parts/tabTypes';
import { EvidenceSheet } from './quality/EvidenceSheet';
import { QualityBreakdown } from './quality/QualityBreakdown';
import { QualityHistory } from './quality/QualityHistory';
import { QualitySummary } from './quality/QualitySummary';
import { useLeadQuality, type QualityItem } from './quality/useLeadQuality';

/**
 * The portal's Quality Score tab, for every kind: the summary with
 * Recalculate and Reverify, the criterion-wise breakdown with each item's
 * evidence and Record evidence, and the history.
 */
export function LeadQualityTab({ kind, id }: Readonly<LeadTabProps>) {
  const quality = useLeadQuality(kind, id);
  const { details, query } = quality;
  const [editing, setEditing] = useState<QualityItem | null>(null);
  const evidence = useMemo(() => crmEvidenceByKey(details?.evidence ?? []), [details]);
  const itemNames = useMemo(() => crmItemNamesOf(details?.result), [details]);

  if (!details) {
    return <StateView loading={query.loading} error={query.error} onRetry={query.refetch} />;
  }
  return (
    <YStack gap="$3" testID="lead-quality-tab">
      {quality.notice ? (
        <Text
          color="$success"
          fontWeight="600"
          aria-live="polite"
          role="status"
          testID="lead-quality-notice"
        >
          {quality.notice}
        </Text>
      ) : null}
      <QualitySummary details={details} actions={quality} />
      {details.result ? (
        <QualityBreakdown result={details.result} evidence={evidence} onRecord={setEditing} />
      ) : null}
      <QualityHistory kind={kind} id={id} itemNames={itemNames} version={quality.historyVersion} />
      {editing ? (
        <EvidenceSheet
          key={editing.key}
          item={editing}
          evidence={evidence.get(editing.key)}
          actions={quality}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </YStack>
  );
}
