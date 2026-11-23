import { useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { AreaField, CityField } from '../fields/LocationField';
import SwitchField from '../fields/SwitchField';
import { DiscoveryNumberField, DiscoveryTextField, LeadTypeField, SourcesField } from './lead-discovery.fields';
import { DISCOVERY_LIMITS, leadDiscoveryDefaults, leadDiscoverySchema } from './lead-discovery.schema';
import type { LeadDiscoveryFormProps, LeadDiscoveryFormValues } from './lead-discovery.types';

const ROW = { xs: 'column', sm: 'row' } as const;

/**
 * CRM › Lead Research › Discover leads: a lead type and a city (from the admin
 * Location list), optionally narrowed by locality, category and keywords, how
 * many qualifying leads to find and the score they must reach.
 */
export default function LeadDiscoveryForm({ submitting, onSubmit, onCancel }: Readonly<LeadDiscoveryFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => leadDiscoverySchema(t), [t]);
  const methods = useForm<LeadDiscoveryFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: leadDiscoveryDefaults,
  });
  const { target, score, place, text } = DISCOVERY_LIMITS;

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} noValidate data-testid="lead-discovery-form">
        <Stack spacing={2}>
          <LeadTypeField />
          <Stack direction={ROW} spacing={1.5}>
            <CityField name="city" label={t('crm.common.city')} required />
            <AreaField name="area" cityField="city" label={t('crm.forms.areaLocality')} />
          </Stack>
          <Stack direction={ROW} spacing={1.5}>
            <DiscoveryTextField name="category" label={t('crm.common.category')} hint={t('crm.leadResearch.categoryHint')} maxLength={place} />
            <DiscoveryTextField name="keywords" label={t('crm.leadResearch.keywords')} hint={t('crm.leadResearch.keywordsHint')} maxLength={text} />
          </Stack>
          <Stack direction={ROW} spacing={1.5}>
            <DiscoveryNumberField
              name="target_count"
              label={t('crm.leadResearch.targetCount')}
              hint={t('crm.leadResearch.targetHint', { vars: { min: target.min, max: target.max } })}
              min={target.min}
              max={target.max}
              required
            />
            <DiscoveryNumberField
              name="min_score"
              label={t('crm.leadResearch.minScore')}
              hint={t('crm.leadResearch.minScoreHint')}
              min={score.min}
              max={score.max}
            />
          </Stack>
          <SourcesField />
          <Stack spacing={0.25}>
            <SwitchField name="ai_evidence" label={t('crm.leadResearch.aiEvidence')} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('crm.leadResearch.aiEvidenceHint')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            {onCancel && (
              <DuncitButton onClick={onCancel} disabled={submitting} data-testid="lead-discovery-cancel">
                {t('shell.common.cancel')}
              </DuncitButton>
            )}
            <DuncitButton
              type="submit"
              variant="contained"
              startIcon={<TravelExploreIcon />}
              loading={submitting}
              data-testid="lead-discovery-submit"
            >
              {submitting ? t('crm.leadResearch.starting') : t('crm.leadResearch.startDiscovery')}
            </DuncitButton>
          </Stack>
        </Stack>
      </form>
    </FormProvider>
  );
}
