import { useEffect } from 'react';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  EMPTY_GRIEVANCE_OFFICER,
  grievanceOfficerSchema,
  type GrievanceOfficerFormValues,
} from './grievance-officer.types';
import { useTranslation } from '@duncit/shell';

interface Props {
  initialValues: GrievanceOfficerFormValues;
  saving: boolean;
  error: string | null;
  /** When these details were last changed, already formatted. Blank if never. */
  updatedAt: string;
  onSubmit: (values: GrievanceOfficerFormValues) => Promise<void>;
}

/**
 * The officer's details, as one form.
 *
 * Not a dialog: this is a single record that is always there and always
 * editable, so a page that shows the current values and saves the changed ones
 * beats a table with one row and a pencil icon.
 */
export default function GrievanceOfficerForm({
  initialValues,
  saving,
  error,
  updatedAt,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, formState } = useForm<GrievanceOfficerFormValues, any, GrievanceOfficerFormValues>({
    resolver: zodResolver(grievanceOfficerSchema) as unknown as Resolver<GrievanceOfficerFormValues, any, GrievanceOfficerFormValues>,
    defaultValues: EMPTY_GRIEVANCE_OFFICER,
    mode: 'onTouched',
  });

  // The values arrive after the first render (the query resolves), so the form
  // is seeded when they land rather than at mount.
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <Card variant="outlined">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <RhfTextField
              control={control}
              name="name"
              label={t('shell.common.name')}
              required
              placeholder={t('legal.grievance.officerNamePlaceholder')}
            />
            <RhfTextField
              control={control}
              name="email"
              label={t('shell.common.email')}
              required
              placeholder="grievance@duncit.com"
            />
            <RhfTextField
              control={control}
              name="phone"
              label={t('shell.common.phone')}
              required
              placeholder="+91 98765 43210"
            />
            <RhfTextField
              control={control}
              name="address"
              label={t('legal.grievance.address')}
              multiline
              minRows={3}
              hint="Optional — published only if you fill it in."
            />

            <Stack direction="row" spacing={2} sx={{
              alignItems: "center"
            }}>
              <DuncitButton
                type="submit"
                variant="contained"
                disabled={saving || !formState.isDirty}
              >
                Save
              </DuncitButton>
              {updatedAt && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  Last updated {updatedAt}
                </Typography>
              )}
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
