import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';
import { Input, Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { SURFACE } from '@/components/surface';
import { Card } from '@/components/Card';
import { StateView } from '@/components/StateView';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { EmailVerifyForm, type EmailVerifyValues } from '@/forms/email-verify';
import {
  CrmAppEmailVerificationsDocument,
  CrmAppVerifyEmailDocument,
} from '@/graphql/emailVerification';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { EmailStatusChip } from './EmailStatusChip';
import { VerificationResult, type Verification } from './VerificationResult';

type Row = {
  id: string;
  email: string;
  status: Verification['status'];
  created_at?: string | null;
};

/**
 * CRM › Tools › Email Verifier: check one address now (the verdict and the facts
 * behind it), and every check so far, newest first and searchable — the portal
 * page. A bulk check from a file stays on the portal.
 */
export function EmailVerifierScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadFailed = t('crmApp.common.loadFailed');
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const { crmEmailVerificationsTable } = await gqlRequest(CrmAppEmailVerificationsDocument, {
        query: {
          search: search.trim() || null,
          page,
          page_size: pageSize,
          sort_by: 'created_at',
          sort_dir: 'desc',
        },
      });
      return { rows: crmEmailVerificationsTable.rows, total: crmEmailVerificationsTable.total };
    },
    [search],
  );
  const history = usePagedSearch<Row>(fetchPage, {
    fallbackError: loadFailed,
    scope: 'crm-app/EmailVerifier',
  });

  const check = async ({ email }: EmailVerifyValues) => {
    setError(null);
    try {
      const { crmVerifyEmail } = await gqlRequest(CrmAppVerifyEmailDocument, { email });
      setResult(crmVerifyEmail);
      fireAndForget(history.refresh(), logs.mobileApp, 'crm-app/EmailVerifier', 'refresh');
    } catch (err) {
      setError(errorMessage(err, t('crmApp.emailVerifier.failed')));
    }
  };

  return (
    <FlatList
      data={history.rows}
      keyExtractor={(row) => row.id}
      onEndReached={history.loadMore}
      onEndReachedThreshold={0.4}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListHeaderComponent={
        <YStack gap="$3" marginBottom="$2">
          <Card title={t('crm.emailVerifier.singleTitle')}>
            <Text color="$muted" fontSize="$2">
              {t('crm.emailVerifier.singleSubtitle')}
            </Text>
            <EmailVerifyForm onSubmit={check} />
            {error ? (
              <Text color="$danger" role="alert" testID="email-verify-error">
                {error}
              </Text>
            ) : null}
            {result ? <VerificationResult result={result} /> : null}
          </Card>
          <Text fontSize="$6" fontWeight="800" role="heading">
            {t('crmApp.emailVerifier.history')}
          </Text>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('crmApp.emailVerifier.search')}
            aria-label={t('crmApp.emailVerifier.search')}
            placeholderTextColor="$muted"
            borderColor="$inputBorder"
            autoCapitalize="none"
            autoCorrect={false}
            testID="email-verify-search"
          />
        </YStack>
      }
      renderItem={({ item }) => (
        <XStack alignItems="center" gap="$2" {...SURFACE} testID={`email-row-${item.id}`}>
          <YStack flex={1}>
            <Text fontWeight="600" numberOfLines={1}>
              {item.email}
            </Text>
            {item.created_at ? (
              <Text color="$muted" fontSize="$2">
                {displayDateTime(item.created_at)}
              </Text>
            ) : null}
          </YStack>
          <EmailStatusChip status={item.status} />
        </XStack>
      )}
      ListEmptyComponent={
        <StateView
          loading={history.loading}
          error={history.error}
          empty={t('crmApp.emailVerifier.empty')}
          onRetry={history.refresh}
        />
      }
      ListFooterComponent={
        history.rows.length > 0 && history.loading ? <StateView loading /> : null
      }
    />
  );
}
