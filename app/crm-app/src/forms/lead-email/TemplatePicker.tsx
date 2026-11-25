import { useMemo, useState } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { Input, Label, Text, YStack } from 'tamagui';
import { crmSeedTemplateValue, crmTemplatePlaceholders, crmTemplatesFor } from '@duncit/utils';

import { ChoiceField } from '@/components/ChoiceField';
import type { LeadKind } from '@/features/leads/leadKinds';
import { CrmAppComposeTemplatesDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadEmailValues, TemplateBody } from './lead-email.types';
import { useTemplateBody } from './useTemplateBody';

interface Props {
  control: Control<LeadEmailValues>;
  entity: LeadKind;
  leadName: string;
  leadEmail: string;
  /** The lead's values by slug (venue and host leads), filled into every matching placeholder. */
  leadValues: Readonly<Record<string, string>>;
  onBody: (body: TemplateBody) => void;
}

/**
 * Template mode of the composer — the portal's TemplateBodyPicker: pick one of
 * this kind's active templates (or a static one), every placeholder in it is
 * offered pre-filled from the lead, and the template renders with them.
 */
export function TemplatePicker({
  control,
  entity,
  leadName,
  leadEmail,
  leadValues,
  onBody,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppComposeTemplatesDocument,
    {},
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const templates = useMemo(
    () => crmTemplatesFor(query.data?.crmEmailTemplates ?? [], entity),
    [query.data, entity],
  );
  const selectedId = useWatch({ control, name: 'template_id' });
  const selected = templates.find((tpl) => tpl.template_id === selectedId) ?? null;
  const [vars, setVars] = useState<Record<string, string>>({});
  const errors = useTemplateBody(selected, vars, leadValues, onBody);

  const seed = (id: string | undefined) => {
    const tpl = templates.find((item) => item.template_id === id);
    if (!tpl) return;
    const keys = [
      ...new Set([...crmTemplatePlaceholders(tpl.mjml), ...crmTemplatePlaceholders(tpl.subject)]),
    ];
    const samples = new Map(tpl.variables.map((variable) => [variable.key, variable.sample]));
    setVars(
      Object.fromEntries(
        keys.map((key) => [
          key,
          crmSeedTemplateValue(key, samples.get(key), leadValues, leadName, leadEmail),
        ]),
      ),
    );
  };

  let hint = t('crm.compose.pickTemplate');
  if (query.loading) hint = t('crm.compose.loadingTemplates');
  else if (templates.length === 0) hint = t('crm.compose.noTemplates');

  return (
    <YStack gap="$3">
      <ChoiceField
        control={control}
        name="template_id"
        label={t('crm.components.template')}
        options={templates.map((tpl) => ({ value: tpl.template_id, label: tpl.name }))}
        searchLabel={t('crm.components.template')}
        onPick={(option) => seed(option?.value)}
        testID="compose-template"
      />
      <Text color="$muted" fontSize="$2" aria-live="polite">
        {query.error ?? hint}
      </Text>
      {selected && Object.keys(vars).length > 0 ? (
        <YStack gap="$2">
          <Text color="$muted" fontSize="$2">
            {t('crm.components.variableValuesAutoFilledFromThis')}
          </Text>
          {Object.entries(vars).map(([key, value]) => (
            <YStack key={key} gap="$1">
              <Label htmlFor={`compose-var-${key}`} fontWeight="600">
                {key}
              </Label>
              <Input
                id={`compose-var-${key}`}
                value={value}
                onChangeText={(text) => setVars((prev) => ({ ...prev, [key]: text }))}
                aria-label={key}
                borderColor="$inputBorder"
                placeholderTextColor="$muted"
                testID={`compose-var-${key}`}
              />
            </YStack>
          ))}
        </YStack>
      ) : null}
      {selected && selected.attachments.length > 0 ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.compose.attachments', { count: selected.attachments.length })}
        </Text>
      ) : null}
      {errors.length > 0 ? (
        <Text color="$warning" role="alert" testID="compose-render-errors">
          {errors.slice(0, 2).join(' · ')}
        </Text>
      ) : null}
    </YStack>
  );
}
