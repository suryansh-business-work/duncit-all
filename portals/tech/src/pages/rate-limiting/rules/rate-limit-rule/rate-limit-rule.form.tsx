import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import ScopeSection from './ScopeSection';
import AllowanceSection from './AllowanceSection';
import ResponseSection from './ResponseSection';
import { enumLabel } from '../../labels';
import type { RateLimitOptionsData } from '../../queries';
import {
  BLANK_RULE,
  rateLimitRuleSchema,
  toInput,
  type RateLimitRuleForm as Values,
} from './rate-limit-rule.types';

interface Props {
  options: RateLimitOptionsData;
  initial?: Values;
  saving: boolean;
  opError: string | null;
  onSubmit: (input: Record<string, unknown>) => void;
}

/**
 * The rule editor.
 *
 * Every option list comes from the server, and the only thing this file
 * decides for itself is which fields are worth showing for the channel and
 * algorithm currently selected — a REST rule has no GraphQL operations, and
 * only the token bucket has a burst.
 */
export default function RateLimitRuleFormBody({
  options,
  initial,
  saving,
  opError,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      rateLimitRuleSchema({
        nameTooShort: t('tech.rateLimit.validation.nameTooShort'),
        appRequired: t('tech.rateLimit.validation.appRequired'),
        atLeastOne: t('tech.rateLimit.validation.atLeastOne'),
        wholeNumbers: t('tech.rateLimit.validation.wholeNumbers'),
        burstNeedsTokenBucket: t('tech.rateLimit.validation.burstNeedsTokenBucket'),
      }),
    [t],
  );

  const { control, handleSubmit, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? BLANK_RULE,
  });

  useEffect(() => {
    reset(initial ?? BLANK_RULE);
  }, [initial, reset]);

  const channel = useWatch({ control, name: 'channel' });
  const algorithm = useWatch({ control, name: 'algorithm' });
  const keyBy = useWatch({ control, name: 'key_by' });
  const limit = useWatch({ control, name: 'limit' });
  const windowSeconds = useWatch({ control, name: 'window_seconds' });

  // The sentence the numbers add up to, so nobody has to read four fields and
  // do the arithmetic to know what they just wrote.
  const summary = t('tech.rateLimit.form.summary', {
    vars: {
      limit: String(limit ?? 0),
      seconds: String(windowSeconds ?? 0),
      keyBy: enumLabel(t, keyBy ?? 'IP'),
    },
  });

  return (
    <Stack
      spacing={2}
      component="form"
      id="rate-limit-rule-form"
      onSubmit={handleSubmit((values) => onSubmit(toInput(values)))}
    >
      <RhfTextField
        control={control}
        name="name"
        label={t('shell.common.name')}
        hint={t('tech.rateLimit.field.nameHint')}
        required
      />
      <RhfTextField
        control={control}
        name="description"
        label={t('shell.common.description')}
        hint={t('tech.rateLimit.field.descriptionHint')}
        multiline
        minRows={2}
      />
      <Controller
        control={control}
        name="enabled"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />
            }
            label={t('tech.rateLimit.field.enabled')}
          />
        )}
      />

      <ScopeSection control={control} options={options} channel={channel} />
      <AllowanceSection
        control={control}
        options={options}
        algorithm={algorithm}
        summary={summary}
      />
      <ResponseSection control={control} options={options} />

      {opError && <Alert severity="error">{opError}</Alert>}
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<SaveIcon />}
        disabled={saving}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}
