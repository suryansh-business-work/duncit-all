import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { Toggle } from '@/components/Toggle';
import { ChoiceField } from '@/components/ChoiceField';
import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  DISCOVERY_LEAD_TYPES,
  DISCOVERY_LIMITS,
  DISCOVERY_SOURCES,
  leadDiscoveryDefaults,
  makeLeadDiscoverySchema,
  type LeadDiscoveryValues,
} from './lead-discovery.types';

/** The portal's own words for each source (literal keys for the localization gate). */
const SOURCE_KEY: Record<(typeof DISCOVERY_SOURCES)[number], string> = {
  INSTAGRAM: 'crm.leadResearch.sourceInstagram',
  GOOGLE_MAPS: 'crm.leadResearch.sourceGoogleMaps',
};

/** What to look for, where, and how many qualifying leads to find — the portal's Discover leads form. */
export function LeadDiscoveryForm({
  onSubmit,
}: Readonly<{ onSubmit: (values: LeadDiscoveryValues) => Promise<void> }>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<LeadDiscoveryValues>(makeLeadDiscoverySchema(t)),
    [t],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<
    LeadDiscoveryValues,
    any,
    LeadDiscoveryValues
  >({
    defaultValues: leadDiscoveryDefaults,
    resolver,
    mode: 'onTouched',
  });
  const { min, max } = DISCOVERY_LIMITS.target;
  return (
    <YStack gap="$3">
      <ChoiceField
        control={control}
        name="lead_type"
        label={t('crm.leadResearch.leadType')}
        options={DISCOVERY_LEAD_TYPES.map((type) => ({
          value: type,
          label: t(`crmApp.kind.${type}`),
        }))}
        testID="discovery-type"
      />
      <Text color="$muted" fontSize="$2">
        {t('crm.leadResearch.leadTypeHint')}
      </Text>
      <TextField
        control={control}
        name="city"
        label={t('crm.common.city')}
        testID="discovery-city"
      />
      <TextField
        control={control}
        name="area"
        label={t('crmApp.editor.field.area')}
        testID="discovery-area"
      />
      <TextField
        control={control}
        name="category"
        label={t('crmApp.research.category')}
        hint={t('crm.leadResearch.categoryHint')}
        testID="discovery-category"
      />
      <TextField
        control={control}
        name="keywords"
        label={t('crm.leadResearch.keywords')}
        hint={t('crm.leadResearch.keywordsHint')}
        testID="discovery-keywords"
      />
      <TextField
        control={control}
        name="target_count"
        label={t('crm.leadResearch.targetCount')}
        hint={t('crm.leadResearch.targetHint', { vars: { min, max } })}
        keyboardType="number-pad"
        numeric={{}}
        testID="discovery-target"
      />
      <TextField
        control={control}
        name="min_score"
        label={t('crm.leadResearch.minScore')}
        hint={t('crm.leadResearch.minScoreHint')}
        keyboardType="number-pad"
        numeric={{ nullable: true }}
        testID="discovery-min-score"
      />
      <ChoiceField
        control={control}
        name="sources"
        label={t('crm.leadResearch.sources')}
        options={DISCOVERY_SOURCES.map((source) => ({
          value: source,
          label: t(SOURCE_KEY[source]),
        }))}
        multiple
        testID="discovery-sources"
      />
      <Text color="$muted" fontSize="$2">
        {t('crm.leadResearch.sourcesHint')}
      </Text>
      <Controller
        control={control}
        name="ai_evidence"
        render={({ field }) => (
          <XStack alignItems="center" gap="$3">
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label={t('crm.leadResearch.aiEvidence')}
              testID="discovery-ai"
            />
            <YStack flex={1}>
              <Text fontWeight="600">{t('crm.leadResearch.aiEvidence')}</Text>
              <Text color="$muted" fontSize="$2">
                {t('crm.leadResearch.aiEvidenceHint')}
              </Text>
            </YStack>
          </XStack>
        )}
      />
      <DuncitButton
        label={
          formState.isSubmitting
            ? t('crm.leadResearch.starting')
            : t('crm.leadResearch.startDiscovery')
        }
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="discovery-start"
      />
    </YStack>
  );
}
