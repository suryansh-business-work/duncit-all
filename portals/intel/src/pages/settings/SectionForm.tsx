import type { ReactNode } from 'react';
import { useForm, type Control, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import type { z } from 'zod';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';

export interface SectionFormProps<TIn extends FieldValues, TOut> {
  schema: z.ZodType<TOut, TIn>;
  values: TIn;
  saving: boolean;
  errorMessage: string | null;
  disabled?: boolean;
  onSubmit: (values: TOut) => void;
  children: (control: Control<TIn, unknown, TOut>) => ReactNode;
}

/**
 * The frame every Settings form shares: React Hook Form + the section's Zod
 * schema, the server's refusal shown on top, one Save button. Each section's
 * `.form.tsx` supplies only its schema and fields.
 */
export default function SectionForm<TIn extends FieldValues, TOut>({ schema, values, saving, errorMessage, disabled, onSubmit, children }: Readonly<SectionFormProps<TIn, TOut>>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<TIn, unknown, TOut>({
    defaultValues: values as DefaultValues<TIn>,
    values,
    resolver: zodResolver(schema as never) as Resolver<TIn, unknown, TOut>,
    mode: 'onTouched',
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={1.5} sx={{ maxWidth: 640 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {children(control)}
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving || undefined} disabled={disabled}>
            {t('intel.common.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}
