import { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { YStack } from 'tamagui';

import { StateView } from '@/components/StateView';
import {
  DynamicFieldForm,
  dynamicFieldDefaults,
  dynamicFieldValuesFromRow,
  toDynamicFieldInput,
  type DynamicFieldValues,
} from '@/forms/dynamic-field';
import {
  CrmAppCreateDynamicFieldDocument,
  CrmAppDynamicFieldsDocument,
  CrmAppUpdateDynamicFieldDocument,
} from '@/graphql/dynamicFields';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/**
 * Add or edit one dynamic field — the portal's inline form as a screen. A new
 * field goes to the end of the list; an edited one keeps its place and key.
 */
export function DynamicFieldEditorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'DynamicFieldEditor'>>();
  const id = params.id ?? null;
  const list = useGqlQuery(
    CrmAppDynamicFieldsDocument,
    { include_inactive: true },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => list.data?.crmDynamicFields ?? [], [list.data]);
  const row = id ? rows.find((field) => field.id === id) : undefined;

  useEffect(() => {
    // An edit waits for its field, so the header never says New field first.
    if (id && !row) return;
    navigation.setOptions({
      title: row
        ? t('crm.managedynamicfieldspage.editFieldTitle', { vars: { name: row.label || row.name } })
        : t('crm.managedynamicfieldspage.newField'),
    });
  }, [navigation, id, row, t]);

  const save = async (values: DynamicFieldValues) => {
    setError(null);
    try {
      if (row) {
        await gqlRequest(CrmAppUpdateDynamicFieldDocument, {
          id: row.id,
          input: toDynamicFieldInput(values, row.sort_order),
        });
      } else {
        await gqlRequest(CrmAppCreateDynamicFieldDocument, {
          input: toDynamicFieldInput(values, rows.length),
        });
      }
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  if (!list.data || (id && !row)) {
    return (
      <YStack flex={1} backgroundColor="$background" padding="$4">
        <StateView
          loading={list.loading}
          error={list.error ?? (list.data ? t('crmApp.dynamicFields.notFound') : null)}
          onRetry={list.refetch}
        />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <AuthAlert message={error} testID="dynamic-field-error" /> : null}
        <DynamicFieldForm
          values={row ? dynamicFieldValuesFromRow(row) : dynamicFieldDefaults}
          onSubmit={save}
          onCancel={() => navigation.goBack()}
        />
      </ScrollView>
    </YStack>
  );
}
