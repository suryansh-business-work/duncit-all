import { useEffect, useMemo, useRef } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DialogActions } from '@mui/material';
import { makePodSchema } from './schema';
import { PodFormDataProvider } from './context';
import CascadeEffect from './CascadeEffect';
import PodSections from './PodSections';
import type {
  GenerateMeetingLinkInput,
  PodFormConfig,
  PodFormData,
  PodFormFinance,
  PodFormValues,
  PodOption,
  SearchPodHosts,
} from './types';

export interface PodFormProps {
  initialValues: PodFormValues;
  config: PodFormConfig;
  clubs: any[];
  venues: any[];
  users?: any[];
  products?: any[];
  finance?: PodFormFinance;
  getClubVenueIds: (club: any) => string[];
  meetingPlatforms?: PodOption[];
  onGenerateMeetingLink?: (input: GenerateMeetingLinkInput) => Promise<string>;
  onPickImage?: () => Promise<string | null>;
  onPickVideo?: () => Promise<string | null>;
  searchHosts?: SearchPodHosts;
  dateTimeFormat?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void> | void;
  /** Hands the RHF methods to the parent (used by admin AI-fill). */
  onReady?: (methods: UseFormReturn<PodFormValues>) => void;
  /** Admin hides "Save as Draft" once a pod exists (draft only affects create). */
  hideDraftOnEdit?: boolean;
}

export default function PodForm({
  initialValues,
  config,
  clubs,
  venues,
  users = [],
  products = [],
  finance,
  getClubVenueIds,
  meetingPlatforms,
  onGenerateMeetingLink,
  onPickImage,
  onPickVideo,
  searchHosts,
  dateTimeFormat,
  busy = false,
  error,
  onCancel,
  onSubmit,
  onReady,
  hideDraftOnEdit = false,
}: Readonly<PodFormProps>) {
  const schema = useMemo(() => makePodSchema(config), [config]);
  const submitMode = useRef<'publish' | 'draft'>('publish');
  const methods = useForm<PodFormValues>({
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

  const data: PodFormData = useMemo(
    () => ({
      config,
      clubs,
      venues,
      users,
      products,
      finance,
      getClubVenueIds,
      meetingPlatforms,
      onGenerateMeetingLink,
      onPickImage,
      onPickVideo,
      searchHosts,
      dateTimeFormat,
    }),
    [config, clubs, venues, users, products, finance, getClubVenueIds, meetingPlatforms, onGenerateMeetingLink, onPickImage, onPickVideo, searchHosts, dateTimeFormat],
  );

  const submit = methods.handleSubmit(async (values) => {
    const draft = submitMode.current === 'draft';
    submitMode.current = 'publish';
    await onSubmit(values, { draft });
  });
  const busyOrSubmitting = busy || methods.formState.isSubmitting;
  const isEdit = !!methods.watch('pod_id');
  const showDraft = !(hideDraftOnEdit && isEdit);

  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={data}>
        <form noValidate onSubmit={submit}>
          <CascadeEffect />
          <PodSections />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
            <Button onClick={onCancel}>Cancel</Button>
            {showDraft && (
              <Button
                variant="outlined"
                type="button"
                disabled={busyOrSubmitting}
                onClick={() => {
                  submitMode.current = 'draft';
                  submit().catch(() => undefined);
                }}
              >
                Save as Draft
              </Button>
            )}
            <Button
              variant="contained"
              type="submit"
              disabled={busyOrSubmitting}
              onClick={() => {
                submitMode.current = 'publish';
              }}
            >
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </PodFormDataProvider>
    </FormProvider>
  );
}
