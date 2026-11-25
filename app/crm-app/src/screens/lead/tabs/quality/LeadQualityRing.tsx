import { YStack } from 'tamagui';

import type { LeadKind } from '@/features/leads/leadKinds';
import { CrmAppLeadQualityRingDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { QualityRing } from './QualityRing';

interface Props {
  kind: LeadKind;
  id: string;
  /** Opens the Quality Score tab. */
  onOpen?: () => void;
}

/**
 * The score ring in the lead's header, as the portal's: tapping it opens the
 * Quality Score tab. While it loads it holds its place; a failed read shows
 * nothing here — the tab itself carries the error and its retry.
 */
export function LeadQualityRing({ kind, id, onOpen }: Readonly<Props>) {
  const query = useGqlQuery(CrmAppLeadQualityRingDocument, { entity_type: kind, lead_id: id });
  if (!query.data) {
    return query.loading ? (
      <YStack
        width={48}
        height={48}
        borderRadius={24}
        backgroundColor="$soft"
        testID="lead-quality-ring-loading"
      />
    ) : null;
  }
  const result = query.data.crmLeadQuality.result;
  return (
    <QualityRing
      score={result?.score ?? null}
      tone={result?.tone}
      label={result?.classification_label}
      onPress={onOpen}
      testID="lead-quality-ring"
    />
  );
}
