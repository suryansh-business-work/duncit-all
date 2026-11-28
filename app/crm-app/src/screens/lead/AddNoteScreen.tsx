import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text } from 'tamagui';

import { FormLayout } from '@/components/mobile/FormLayout';
import { CrmAppAddNoteDocument } from '@/graphql/leads';
import { NoteForm, noteToHtml, type NoteValues } from '@/forms/note';
import { gqlRequest } from '@/services/graphql.client';
import { haptics } from '@/services/haptics';
import { useTranslation } from '@/hooks/useTranslation';
import { errorMessage } from '@/utils/errors';
import type { AppStackParamList } from '@/navigation/types';

/** A note on the lead's timeline — the same manual log the portal writes, with its history and permissions. */
export function AddNoteScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<AppStackParamList, 'AddNote'>>();
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ summary, body }: NoteValues) => {
    setError(null);
    try {
      await gqlRequest(CrmAppAddNoteDocument, {
        input: {
          entity_type: params.kind,
          entity_id: params.id,
          summary: summary || null,
          body_html: noteToHtml(body),
          body_text: body,
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
      <Text color="$muted">{params.name}</Text>
      <NoteForm onSubmit={submit} error={error} />
    </FormLayout>
  );
}
