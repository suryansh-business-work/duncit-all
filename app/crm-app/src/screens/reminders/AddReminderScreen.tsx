import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text } from 'tamagui';

import { CrmAppCreateReminderDocument } from '@/graphql/reminders';
import { ReminderForm, reminderDueDate, type ReminderValues } from '@/forms/reminder';
import { gqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';
import { errorMessage } from '@/utils/errors';
import type { AppStackParamList } from '@/navigation/types';

/** A new reminder — on a lead when opened from one, otherwise a general one (the portal allows both). */
export function AddReminderScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<AppStackParamList, 'AddReminder'>>();
  const [error, setError] = useState<string | null>(null);

  const submit = async (values: ReminderValues) => {
    setError(null);
    try {
      await gqlRequest(CrmAppCreateReminderDocument, {
        input: {
          entity_type: params.kind ?? 'GENERAL',
          lead_id: params.id ?? null,
          title: values.title,
          due_at: reminderDueDate(values).toISOString(),
          notes: values.notes || null,
        },
      });
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      {params.name ? <Text color="$muted">{params.name}</Text> : null}
      <ReminderForm onSubmit={submit} initialTitle={params.title} error={error} />
    </ScrollView>
  );
}
