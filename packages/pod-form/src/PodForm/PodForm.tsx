import { useEffect, useMemo, useRef } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { usePodSchema } from '../usePodSchema';
import { useTranslation } from '../i18n/useTranslation';
import { PodFormDataProvider } from '../context';
import CascadeEffect from '../CascadeEffect';
import PodCategoryFilter from '../PodCategoryFilter';
import { usePodCategoryFilter } from '../usePodCategoryFilter';
import AutoPodStepper from '../auto-pod/AutoPodStepper';
import PodFormActions from '../PodFormActions';
import PodFormLayout from '../PodFormLayout';
import PodSections from '../PodSections';
import type { PodFormData, PodFormValues } from '../types';
import type { PodFormProps } from './types';

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
  dateFormatter,
  slotLabels,
  editingPodDocId,
  busy = false,
  error,
  onCancel,
  onSubmit,
  onReady,
  hideDraftOnEdit = false,
  editing = false,
  preview,
}: Readonly<PodFormProps>) {
  const { t } = useTranslation();
  const schema = usePodSchema(config, t);
  const submitMode = useRef<'publish' | 'draft'>('publish');
  const methods = useForm<PodFormValues, any, PodFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<PodFormValues, any, PodFormValues>,
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

  // The pod's category comes from its club, so this picker persists nothing of
  // its own — it just narrows which clubs are offered, and does it above every
  // section so the category is chosen first (same order as the host apps). It
  // opens on the chosen club's category, so an edited pod shows it pre-filled.
  const categoryFilter = usePodCategoryFilter(clubs, methods.watch('club_id'));
  const { clubsInCategory } = categoryFilter;

  const data: PodFormData = useMemo(
    () => ({
      config,
      clubs: clubsInCategory,
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
      dateFormatter,
      slotLabels,
      editingPodDocId,
    }),
    [config, clubsInCategory, venues, users, products, finance, getClubVenueIds, meetingPlatforms, onGenerateMeetingLink, onPickImage, onPickVideo, searchHosts, dateFormatter, slotLabels, editingPodDocId],
  );

  const submit = methods.handleSubmit(async (values) => {
    const draft = submitMode.current === 'draft';
    submitMode.current = 'publish';
    await onSubmit(values, { draft });
  });
  const busyOrSubmitting = busy || methods.formState.isSubmitting;
  const isEdit = !!methods.watch('pod_id');
  // An Auto Pod has no draft: it is either open for enrolment or it is not.
  const showDraft = !config.autoPod && !(hideDraftOnEdit && isEdit);

  // Auto Pod mode is a three-step stepper — the category (and who could enrol
  // in it), the pod, then a read-only review above the roll-out button — and
  // it draws the category field, the sections and the actions itself.
  const stepper = (
    <AutoPodStepper
      editing={editing}
      busy={busy}
      disabled={busyOrSubmitting}
      error={error ?? null}
      onCancel={onCancel}
    />
  );

  // One spacing for every block in the column — the category, the media, each
  // section, the error and the actions — rather than a margin per component.
  // The category picker here persists nothing: it only narrows the clubs.
  const sections = (
    <Stack spacing={2}>
      <PodCategoryFilter
        value={categoryFilter.value}
        onChange={categoryFilter.onChange}
        matchCount={clubsInCategory.length}
        clubCount={clubs.length}
      />
      <PodSections />
      {/* `whiteSpace: pre-line` keeps a content refusal readable: it arrives as
          a headline followed by one line per rule broken. */}
      {error && (
        <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}
      <PodFormActions
        showDraft={showDraft}
        busy={busy}
        disabled={busyOrSubmitting}
        onCancel={onCancel}
        onDraft={() => {
          submitMode.current = 'draft';
          submit().catch(() => undefined);
        }}
        onPublish={() => {
          submitMode.current = 'publish';
        }}
      />
    </Stack>
  );
  const fields = config.autoPod ? stepper : sections;

  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={data}>
        <form noValidate onSubmit={submit}>
          <CascadeEffect />
          <PodFormLayout fields={fields} preview={preview} />
        </form>
      </PodFormDataProvider>
    </FormProvider>
  );
}
