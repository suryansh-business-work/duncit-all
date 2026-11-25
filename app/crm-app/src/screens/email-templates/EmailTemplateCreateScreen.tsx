import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { StackActions, useNavigation, type NavigationProp } from '@react-navigation/native';
import { YStack } from 'tamagui';

import { Notice } from '@/components/email-templates/Notice';
import {
  EmailTemplateCreateForm,
  toEmailTemplateCreateInput,
  type EmailTemplateCreateValues,
} from '@/forms/email-template-create';
import {
  CrmAppEmailTemplateCreateDocument,
  CrmAppEmailTemplateStarterDocument,
} from '@/graphql/emailTemplates';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import type { AppStackParamList } from '@/navigation/types';

/**
 * New email template — the portal's create dialog as a screen. The body starts
 * on the shared Duncit starter (the same one every console starts from); once
 * created, the template opens in its editor.
 */
export function EmailTemplateCreateScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const starter = useGqlQuery(
    CrmAppEmailTemplateStarterDocument,
    {},
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [seeded, setSeeded] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mjml = seeded || starter.data?.crmEmailStarterMjml || '';

  useEffect(() => {
    navigation.setOptions({ title: t('crm.emailTemplates.newEmailTemplate') });
  }, [navigation, t]);

  const create = async (values: EmailTemplateCreateValues) => {
    setError(null);
    try {
      const { createCrmEmailTemplate } = await gqlRequest(CrmAppEmailTemplateCreateDocument, {
        input: toEmailTemplateCreateInput(values, mjml),
      });
      navigation.dispatch(
        StackActions.replace('EmailTemplateEditor', { id: createCrmEmailTemplate.template_id }),
      );
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {starter.error ? (
          <Notice tone="error" testID="template-create-starter-error">
            {starter.error}
          </Notice>
        ) : null}
        {error ? (
          <Notice tone="error" testID="template-create-error">
            {error}
          </Notice>
        ) : null}
        <EmailTemplateCreateForm
          mjml={mjml}
          onSeed={setSeeded}
          onSubmit={create}
          onCancel={() => navigation.goBack()}
        />
      </ScrollView>
    </YStack>
  );
}
