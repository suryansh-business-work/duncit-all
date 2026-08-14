import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { SignupPolicy } from '@/stores/policies.store';
import { PolicyAcceptanceRow } from './PolicyAcceptanceRow';

export interface PolicyAcceptanceBodyProps {
  policies: readonly SignupPolicy[];
  loading: boolean;
  failed: boolean;
  /** The lead sentence, which differs between the form and the Google pass. */
  intro: string;
  acceptedIds: readonly string[];
  onToggle: (id: string) => void;
  onRead: (id: string) => void;
}

/** The sheet's list state — loading, the failure, or the policies themselves. */
export function PolicyAcceptanceBody({
  policies,
  loading,
  failed,
  intro,
  acceptedIds,
  onToggle,
  onRead,
}: Readonly<PolicyAcceptanceBodyProps>) {
  const { t } = useTranslation();

  if (failed) {
    return (
      <Text
        testID="policy-acceptance-failed"
        paddingHorizontal={16}
        paddingVertical={28}
        fontSize={13.5}
        color="$danger"
      >
        {t('policyAcceptance.loadFailed')}
      </Text>
    );
  }

  if (loading && policies.length === 0) {
    return (
      <YStack testID="policy-acceptance-loading" alignItems="center" gap={10} paddingVertical={32}>
        <Spinner color="$primary" />
        <Text fontSize={13} color="$muted">
          {t('policyAcceptance.loading')}
        </Text>
      </YStack>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 12 }}>
      <Text fontSize={13} lineHeight={20} color="$muted">
        {intro}
      </Text>
      {policies.map((policy) => (
        <PolicyAcceptanceRow
          key={policy.id}
          policy={policy}
          accepted={acceptedIds.includes(policy.id)}
          onToggle={() => onToggle(policy.id)}
          onRead={() => onRead(policy.id)}
        />
      ))}
    </ScrollView>
  );
}
