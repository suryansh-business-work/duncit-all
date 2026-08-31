import { useEffect, useMemo, type ReactNode } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, DialogActions, Grid } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { makeClubSchema } from './schema';
import { ClubFormDataProvider } from './context';
import ClubSections from './ClubSections';
import type { ClubAdmin, ClubFormConfig, ClubFormData, ClubFormValues } from './types';
import { useTranslation } from './i18n/useTranslation';

export interface ClubFormProps {
  initialValues: ClubFormValues;
  config: ClubFormConfig;
  /** Pre-assigned admins (Club.club_admins) to seed labelled chips. */
  initialAdmins?: ClubAdmin[];
  /** Rich media picker; omit to fall back to a newline textarea. */
  onPickImage?: (folder?: string) => Promise<string | null>;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: ClubFormValues, options: { draft: boolean }) => Promise<void> | void;
  /** Hands the RHF methods to the parent (used by the admin AI-fill button). */
  onReady?: (methods: UseFormReturn<ClubFormValues>) => void;
  /**
   * Live preview column, rendered INSIDE this form's provider so it can watch
   * the values being typed. Given one, the form lays itself out in two columns;
   * omitted, it stays a single column.
   */
  preview?: ReactNode;
}

export default function ClubForm({
  initialValues,
  config,
  initialAdmins = [],
  onPickImage,
  busy = false,
  error,
  onCancel,
  onSubmit,
  onReady,
  preview,
}: Readonly<ClubFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeClubSchema(config), [config]);
  const methods = useForm<ClubFormValues, any, ClubFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    methods.reset(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  useEffect(() => {
    onReady?.(methods);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods]);

  const data: ClubFormData = useMemo(
    () => ({ config, initialAdmins, onPickImage }),
    [config, initialAdmins, onPickImage],
  );

  // Full validation on final save; drafts (create only) may be incomplete so
  // they submit the raw values without running the schema.
  const submitFinal = methods.handleSubmit((values) => onSubmit(values, { draft: false }));
  const saveDraft = () =>
    Promise.resolve(onSubmit(methods.getValues(), { draft: true })).catch(() => undefined);

  const isEdit = !!methods.watch('id');
  const nameFilled = !!methods.watch('club_name')?.trim();
  const busyOrSubmitting = busy || methods.formState.isSubmitting;

  const fields = (
    <>
      <ClubSections />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel}>{t('clubForm.common.cancel')}</DuncitButton>
        {!isEdit && (
          <DuncitButton
            variant="outlined"
            type="button"
            disabled={busyOrSubmitting || !nameFilled}
            onClick={() => {
              saveDraft().catch(console.error);
            }}
          >
            Save as Draft
          </DuncitButton>
        )}
        <DuncitButton variant="contained" type="submit" disabled={busyOrSubmitting || !nameFilled}>
          {busy ? 'Saving…' : 'Save'}
        </DuncitButton>
      </DialogActions>
    </>
  );

  return (
    <FormProvider {...methods}>
      <ClubFormDataProvider value={data}>
        <form noValidate onSubmit={submitFinal}>
          <Grid container spacing={3} sx={{
            alignItems: "flex-start"
          }}>
            <Grid
              size={{
                xs: 12,
                lg: preview ? 7 : 12
              }}>
              {fields}
            </Grid>
            {preview && (
              <Grid
                size={{
                  xs: 12,
                  lg: 5
                }}>
                {/* Scrolls inside itself: the detail preview is taller than the
                    viewport on a long pod, and a plain sticky box would park
                    its bottom out of reach. */}
                <Box
                  sx={{
                    position: { lg: 'sticky' },
                    top: 16,
                    maxHeight: { lg: 'calc(100vh - 32px)' },
                    overflowY: { lg: 'auto' },
                  }}
                >
                  {preview}
                </Box>
              </Grid>
            )}
          </Grid>
        </form>
      </ClubFormDataProvider>
    </FormProvider>
  );
}
