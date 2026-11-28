import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text } from 'tamagui';

import { FormLayout } from '@/components/mobile/FormLayout';
import { CrmAppCreateReminderDocument } from '@/graphql/reminders';
import { ReminderForm, reminderDueDate, type ReminderValues } from '@/forms/reminder';
import { gqlRequest } from '@/services/graphql.client';
import { haptics } from '@/services/haptics';
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
      haptics.success();
      navigation.goBack();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <FormLayout>
      {params.name ? <Text color="$muted">{params.name}</Text> : null}
      <ReminderForm onSubmit={submit} initialTitle={params.title} error={error} />
    </FormLayout>
  );
}
