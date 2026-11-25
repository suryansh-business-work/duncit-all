import { useEffect } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { crmProviderToSelect } from '@duncit/utils';

import { ChoiceField } from '@/components/ChoiceField';
import { CrmAppComposeProvidersDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadEmailValues } from './lead-email.types';

/**
 * Which email provider sends it — the portal's CommsProviderSelect: only the
 * active providers from the Tech portal, the default picked when nothing (or
 * a provider that is no longer active) is picked.
 */
export function ProviderPicker({ control }: Readonly<{ control: Control<LeadEmailValues> }>) {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppComposeProvidersDocument,
    { type: 'SMTP' },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const { field } = useController({ control, name: 'provider_id' });
  const options = query.data?.commsProviderOptions;
  const { value, onChange } = field;

  useEffect(() => {
    const next = crmProviderToSelect(options ?? [], value);
    if (next) onChange(next);
  }, [options, value, onChange]);

  return (
    <YStack gap="$1">
      <ChoiceField
        control={control}
        name="provider_id"
        label={t('crm.components.provider')}
        options={(options ?? []).map((option) => ({
          value: option.id,
          label: option.is_default
            ? t('crm.compose.providerDefault', { vars: { name: option.name } })
            : option.name,
        }))}
        testID="compose-provider"
      />
      {query.error ? (
        <Text color="$danger" fontSize="$2" role="alert">
          {query.error}
        </Text>
      ) : null}
      {options && options.length === 0 ? (
        <Text color="$muted" fontSize="$2" testID="compose-no-providers">
          {t('crm.compose.noProviders')}
        </Text>
      ) : null}
    </YStack>
  );
}
