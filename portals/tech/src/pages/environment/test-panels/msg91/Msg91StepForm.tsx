import { useState, type ReactNode } from 'react';
import { useMutation } from '@apollo/client/react';
import { useForm, type FieldValues, type Path, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { z } from 'zod';
import type { EnvMsg91TestInput, EnvTestRichResult } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { TEST_ENV_MSG91 } from '../../queries';
import ResultAlert from '../ResultAlert';

export interface Msg91StepField<T extends FieldValues> {
  name: Path<T>;
  label: string;
  hint: string;
  /** Renders a select instead of a text box. */
  options?: ReadonlyArray<{ value: string; label: string }>;
  numeric?: boolean;
  /** A fixed width for a short box (the country code); otherwise it grows. */
  width?: number;
}

interface Props<T extends FieldValues> {
  entryId: string;
  testId: string;
  title: string;
  hint: string;
  actionLabel: string;
  icon: ReactNode;
  fields: ReadonlyArray<Msg91StepField<T>>;
  schema: z.ZodType<T, T>;
  /** The form's values. A new object (a request id from an earlier step) resets it. */
  values: T;
  toInput: (values: T) => EnvMsg91TestInput;
  /** Asked before the call is made; false cancels it (a real, billed send). */
  beforeRun?: (values: T) => Promise<boolean>;
  /** Handed what the next step needs — the request id or the access token. */
  onAnswer?: (data: string) => void;
}

/**
 * One step of the MSG91 widget: its boxes, its button, and what MSG91 said.
 *
 * The four steps differ only in which boxes they show and which action they
 * send, so they are four configurations of this form rather than four forms
 * (rule 34). Each is still a real RHF + Zod form (rule 10).
 */
export default function Msg91StepForm<T extends FieldValues>({
  entryId,
  testId,
  title,
  hint,
  actionLabel,
  icon,
  fields,
  schema,
  values,
  toInput,
  beforeRun,
  onAnswer,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const [result, setResult] = useState<EnvTestRichResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_MSG91);
  const { control, handleSubmit } = useForm<T, any, T>({
    values,
    resolver: zodResolver(schema) as unknown as Resolver<T, any, T>,
    mode: 'onChange',
  });

  const submit = handleSubmit(async (form) => {
    if (beforeRun && !(await beforeRun(form))) return;
    setResult(null);
    try {
      const res = await run({ variables: { id: entryId, input: toInput(form) } });
      const answer = res.data?.testEnvMsg91 ?? null;
      setResult(answer);
      if (answer?.ok && answer.data) onAnswer?.(answer.data);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  });

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={1} data-testid={testId}>
      <Divider />
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {hint}
      </Typography>
      <Stack direction="row" spacing={1}>
        {fields.map((field) => (
          <RhfTextField<T>
            key={field.name}
            control={control}
            name={field.name}
            label={field.label}
            hint={field.hint}
            size="small"
            select={!!field.options}
            autoComplete="off"
            sx={field.width ? { width: field.width, flexShrink: 0 } : { flex: 1 }}
            slotProps={{
              htmlInput: {
                autoComplete: 'off',
                inputMode: field.numeric ? 'numeric' : 'text',
                'data-1p-ignore': true,
              },
            }}
          >
            {field.options?.map((option) => (
              <MenuItem key={option.value || 'default'} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RhfTextField>
        ))}
      </Stack>
      <DuncitButton type="submit" variant="outlined" startIcon={icon} disabled={loading}>
        {loading ? t('tech.msg91.working') : actionLabel}
      </DuncitButton>
      <ResultAlert result={result} />
      {result?.ok && result.data ? (
        <TextField
          label={t('tech.msg91.returnedValue')}
          value={result.data}
          size="small"
          fullWidth
          multiline
          slotProps={{ htmlInput: { readOnly: true } }}
        />
      ) : null}
    </Stack>
  );
}
