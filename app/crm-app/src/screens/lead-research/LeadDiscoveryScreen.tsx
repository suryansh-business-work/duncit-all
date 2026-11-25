import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'tamagui';

import { Card } from '@/components/Card';
import {
  LeadDiscoveryForm,
  toLeadDiscoveryInput,
  type LeadDiscoveryValues,
} from '@/forms/lead-discovery';
import { CrmAppStartDiscoveryDocument } from '@/graphql/leadResearch';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorCode, errorMessage } from '@/utils/errors';

/**
 * Discover leads: the portal's request form. A started discovery runs in the
 * background — its progress shows in Discoveries. A missing search key is
 * called out on its own, so the person knows an administrator has to fix it.
 */
export function LeadDiscoveryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [error, setError] = useState<{ message: string; notConfigured: boolean } | null>(null);

  const start = async (values: LeadDiscoveryValues) => {
    setError(null);
    try {
      await gqlRequest(CrmAppStartDiscoveryDocument, { input: toLeadDiscoveryInput(values) });
      navigation.goBack();
    } catch (err) {
      const notConfigured = errorCode(err) === 'NOT_CONFIGURED';
      setError({
        message: notConfigured
          ? t('crm.leadResearch.notConfiguredBody')
          : errorMessage(err, t('crmApp.common.saveFailed')),
        notConfigured,
      });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text color="$muted">{t('crm.leadResearch.discoverIntro')}</Text>
      {error?.notConfigured ? (
        <Card title={t('crm.leadResearch.notConfiguredTitle')} testID="discovery-not-configured">
          <Text>{error.message}</Text>
        </Card>
      ) : null}
      {error && !error.notConfigured ? (
        <Text color="$danger" role="alert" testID="discovery-error">
          {error.message}
        </Text>
      ) : null}
      <LeadDiscoveryForm onSubmit={start} />
    </ScrollView>
  );
}
