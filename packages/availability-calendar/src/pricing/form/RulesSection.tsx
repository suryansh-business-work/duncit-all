import { Controller, useFieldArray, type Control } from 'react-hook-form';
import { Box, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { ruleModeLabel, ruleTypeLabel } from '../format';
import { PRICE_RULE_MODES, PRICE_RULE_TYPES } from '../types';
import { NumberField } from './fields';
import RuleTarget from './RuleTarget';
import { blankRule, type VenuePricingFormValues } from './venue-pricing.types';

interface Props {
  control: Control<VenuePricingFormValues>;
}

/**
 * Price rules: a weekday surcharge, a date override or a date range, each a
 * percent or a flat amount on the base (negative = discount). When an override
 * matches a day, only overrides apply that day — the hint says so.
 */
export default function RulesSection({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'price_rules' });

  return (
    <SectionCard
      title={t('venuePricing.rules.title')}
      subtitle={t('venuePricing.rules.subtitle')}
      action={
        <DuncitButton
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append(blankRule('WEEKDAY_SURCHARGE'))}
          data-testid="pricing-rule-add"
        >
          {t('venuePricing.rules.add')}
        </DuncitButton>
      }
    >
      {fields.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('venuePricing.rules.empty')}
        </Typography>
      )}
      <Stack spacing={2} divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
        {fields.map((field, index) => (
          <Stack key={field.id} spacing={1.5} data-testid={`pricing-rule-${index}`}>
            <Grid container spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  control={control}
                  name={`price_rules.${index}.type`}
                  render={({ field: type }) => (
                    <TextField {...type} select size="small" fullWidth label={t('venuePricing.rules.type')}>
                      {PRICE_RULE_TYPES.map((value) => (
                        <MenuItem key={value} value={value}>
                          {ruleTypeLabel(t, value)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 7 }}>
                <RhfTextField
                  control={control}
                  name={`price_rules.${index}.label`}
                  size="small"
                  label={t('venuePricing.rules.label')}
                  hint={t('venuePricing.rules.labelHint')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <DuncitIconButton
                  aria-label={t('venuePricing.rules.remove', { vars: { n: index + 1 } })}
                  onClick={() => remove(index)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </DuncitIconButton>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Controller
                  control={control}
                  name={`price_rules.${index}.mode`}
                  render={({ field: mode }) => (
                    <TextField {...mode} select size="small" fullWidth label={t('venuePricing.rules.mode')}>
                      {PRICE_RULE_MODES.map((value) => (
                        <MenuItem key={value} value={value}>
                          {ruleModeLabel(t, value)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <NumberField
                  control={control}
                  name={`price_rules.${index}.value`}
                  label={t('venuePricing.rules.value')}
                  hint={t('venuePricing.rules.valueHint')}
                />
              </Grid>
            </Grid>
            <RuleTarget control={control} index={index} />
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  );
}
