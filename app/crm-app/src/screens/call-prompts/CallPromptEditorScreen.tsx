import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { CallPromptForm, callPromptDefaults, type CallPromptValues } from '@/forms/call-prompt';
import {
  CrmAppCallPromptDocument,
  CrmAppCreateCallPromptDocument,
  CrmAppDeleteCallPromptDocument,
  CrmAppUpdateCallPromptDocument,
} from '@/graphql/callPrompts';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

const SCOPE = 'crm-app/CallPromptEditorScreen';

/** Add or edit one Static Content prompt, and delete it — the portal's dialog as a screen. */
export function CallPromptEditorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'CallPromptEditor'>>();
  const id = params.id ?? null;
  const saved = useGqlQuery(
    CrmAppCallPromptDocument,
    { id: id ?? '' },
    { skip: !id, fallbackError: t('crmApp.common.loadFailed') },
  );
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const prompt = saved.data?.crmCallPrompt ?? null;

  useEffect(() => {
    navigation.setOptions({ title: id ? t('crm.callPrompts.edit') : t('crm.callPrompts.add') });
  }, [navigation, id, t]);

  const save = async (values: CallPromptValues) => {
    setError(null);
    try {
      if (id) await gqlRequest(CrmAppUpdateCallPromptDocument, { id, input: values });
      else await gqlRequest(CrmAppCreateCallPromptDocument, { input: values });
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  const remove = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await gqlRequest(CrmAppDeleteCallPromptDocument, { id });
      setConfirming(false);
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  if (id && !prompt) {
    return (
      <YStack flex={1} backgroundColor="$background" padding="$4">
        <StateView loading={saved.loading} error={saved.error} onRetry={saved.refetch} />
      </YStack>
    );
  }
  const values: CallPromptValues = prompt
    ? {
        name: prompt.name,
        description: prompt.description ?? '',
        language: prompt.language || callPromptDefaults.language,
        context: prompt.context,
        is_active: prompt.is_active,
      }
    : callPromptDefaults;

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <AuthAlert message={error} testID="prompt-error" /> : null}
        <CallPromptForm
          values={values}
          submitLabel={id ? t('crm.callPrompts.saveChanges') : t('crm.common.add')}
          onSubmit={save}
        />
        {id ? (
          <DuncitButton
            label={t('shell.common.delete')}
            onPress={() => setConfirming(true)}
            variant="outline"
            tone="danger"
            fullWidth
            testID="prompt-delete"
          />
        ) : null}
      </ScrollView>
      <ConfirmDialog
        open={confirming}
        title={t('crm.callPrompts.deleteStaticContent')}
        message={t('crm.callPrompts.deleteMessage', { vars: { name: prompt?.name ?? '' } })}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={deleting}
        onConfirm={() => fireAndForget(remove(), logs.mobileApp, SCOPE, 'delete')}
        onCancel={() => setConfirming(false)}
        testID="prompt-delete-dialog"
      />
    </YStack>
  );
}
