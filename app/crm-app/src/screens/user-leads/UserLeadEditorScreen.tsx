import { useLayoutEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { StateView } from '@/components/StateView';
import { UserLeadForm, type UserLeadValues } from '@/forms/user-lead';
import {
  CrmAppCreateUserLeadDocument,
  CrmAppUpdateUserLeadDocument,
  CrmAppUserLeadDocument,
} from '@/graphql/userLeads';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/** Add a WhatsApp user lead by hand, or correct one's phone or name — the portal's two dialogs. */
export function UserLeadEditorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<AppStackParamList, 'UserLeadEditor'>>();
  const id = params.id ?? null;
  const [error, setError] = useState<string | null>(null);
  const existing = useGqlQuery(
    CrmAppUserLeadDocument,
    { id: id ?? '' },
    { skip: !id, fallbackError: t('crmApp.common.loadFailed') },
  );
  const lead = existing.data?.waUserLead ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: id ? t('crm.userLeads.editUserLead') : t('crm.userLeads.newUserLead'),
    });
  }, [id, navigation, t]);

  if (id && !lead) {
    const notFound =
      !existing.loading && !existing.error && existing.data ? t('crmApp.userLeads.notFound') : null;
    return (
      <StateView
        loading={existing.loading || (!existing.error && !notFound)}
        error={existing.error ?? notFound}
        onRetry={existing.refetch}
      />
    );
  }

  const submit = async ({ phone, name }: UserLeadValues) => {
    setError(null);
    try {
      if (id) await gqlRequest(CrmAppUpdateUserLeadDocument, { id, input: { phone, name } });
      else await gqlRequest(CrmAppCreateUserLeadDocument, { input: { phone, name: name || null } });
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <UserLeadForm
        key={lead?.id ?? 'new'}
        initial={lead ? { phone: lead.phone, name: lead.name ?? '' } : undefined}
        onSubmit={submit}
        submitLabel={id ? t('crmApp.editor.save') : t('crmApp.userLeads.create')}
        error={error}
      />
    </ScrollView>
  );
}
