import type { Control } from 'react-hook-form';
import { Alert, Box, Divider, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import EnumSelect from './EnumSelect';
import { enumOptions } from '../../labels';
import type { RateLimitOptionsData } from '../../queries';
import type { RateLimitRuleForm } from './rate-limit-rule.types';

interface Props {
  control: Control<RateLimitRuleForm>;
  options: RateLimitOptionsData;
  algorithm: string;
  /** The plain-English sentence the current numbers add up to. */
  summary: string;
}

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };
const NUMBER_INPUT = { htmlInput: { min: 0 } };

/**
 * The allowance: how much, over how long, counted per what.
 *
 * `burst` is only rendered for the token bucket, because it is the only
 * algorithm that has one — see the schema's refine, which refuses a burst on
 * the other two rather than silently ignoring it.
 */
export default function AllowanceSection({
  control,
  options,
  algorithm,
  summary,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Divider textAlign="left">
        <Typography variant="overline">{t('tech.rateLimit.form.allowance')}</Typography>
      </Divider>
      <Box sx={GRID}>
        <EnumSelect
          control={control}
          name="key_by"
          label={t('tech.rateLimit.field.keyBy')}
          hint={t('tech.rateLimit.field.keyByHint')}
          options={enumOptions(t, options.key_by)}
        />
        <EnumSelect
          control={control}
          name="algorithm"
          label={t('tech.rateLimit.field.algorithm')}
          hint={t('tech.rateLimit.field.algorithmHint')}
          options={enumOptions(t, options.algorithms)}
        />
        <RhfTextField
          control={control}
          name="limit"
          type="number"
          label={t('tech.rateLimit.field.limit')}
          hint={t('tech.rateLimit.field.limitHint')}
          slotProps={NUMBER_INPUT}
        />
        <RhfTextField
          control={control}
          name="window_seconds"
          type="number"
          label={t('tech.rateLimit.field.window')}
          hint={t('tech.rateLimit.field.windowHint')}
          slotProps={NUMBER_INPUT}
        />
        {algorithm === 'TOKEN_BUCKET' && (
          <RhfTextField
            control={control}
            name="burst"
            type="number"
            label={t('tech.rateLimit.field.burst')}
            hint={t('tech.rateLimit.field.burstHint')}
            slotProps={NUMBER_INPUT}
          />
        )}
        <RhfTextField
          control={control}
          name="block_seconds"
          type="number"
          label={t('tech.rateLimit.field.blockSeconds')}
          hint={t('tech.rateLimit.field.blockSecondsHint')}
          slotProps={NUMBER_INPUT}
        />
      </Box>
      <Alert severity="info" variant="outlined">
        {summary}
      </Alert>
    </>
  );
}
