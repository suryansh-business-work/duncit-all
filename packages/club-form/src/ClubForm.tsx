import { useEffect, useMemo } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DialogActions } from '@mui/material';
import { makeClubSchema } from './schema';
import { ClubFormDataProvider } from './context';
import ClubSections from './ClubSections';
import type { ClubAdmin, ClubFormConfig, ClubFormData, ClubFormValues } from './types';

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
}: Readonly<ClubFormProps>) {
  const schema = useMemo(() => makeClubSchema(config), [config]);
  const methods = useForm<ClubFormValues>({
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

  return (
    <FormProvider {...methods}>
      <ClubFormDataProvider value={data}>
        <form noValidate onSubmit={submitFinal}>
          <ClubSections />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
            <Button onClick={onCancel}>Cancel</Button>
            {!isEdit && (
              <Button
                variant="outlined"
                type="button"
                disabled={busyOrSubmitting || !nameFilled}
                onClick={() => {
                  void saveDraft();
                }}
              >
                Save as Draft
              </Button>
            )}
            <Button variant="contained" type="submit" disabled={busyOrSubmitting || !nameFilled}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </ClubFormDataProvider>
    </FormProvider>
  );
}
