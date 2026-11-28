import type { ReactNode } from 'react';
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props<V extends FieldValues, O> {
  methods: UseFormReturn<V, unknown, O>;
  /** Resolves true once saved. */
  onSubmit: (values: O) => Promise<boolean>;
  onCancel: () => void;
  submitLabel: string;
  testId: string;
  children: ReactNode;
}

/** The form element, its field-group context and the Cancel / Save row every HR profile form shares. */
export default function FormShell<V extends FieldValues, O>({ methods, onSubmit, onCancel, submitLabel, testId, children }: Readonly<Props<V, O>>) {
  const { t } = useTranslation();
  const { handleSubmit, formState } = methods;
  return (
    <FormProvider {...methods}>
      <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })} data-testid={testId}>
        {children}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={formState.isSubmitting} data-testid={`${testId}-cancel`}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} disabled={formState.isSubmitting} data-testid={`${testId}-submit`}>
            {submitLabel}
          </DuncitButton>
        </Stack>
      </Stack>
    </FormProvider>
  );
}
