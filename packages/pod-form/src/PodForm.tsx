import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { makePodSchema } from './schema';
import { useTranslation } from './i18n/useTranslation';
import { PodFormDataProvider } from './context';
import CascadeEffect from './CascadeEffect';
import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import PodCategoryFilter from './PodCategoryFilter';
import AutoPodCategoryField from './AutoPodCategoryField';
import PodFormActions from './PodFormActions';
import PodFormLayout from './PodFormLayout';
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
  /** Admin-configured formatter from `useDateFormat()`; drives the slot calendar. */
  dateFormatter: PodFormData['dateFormatter'];
  /** Slot-picker copy — `shell.slots.*` in the portals (rule 38). */
  slotLabels: PodFormData['slotLabels'];
  /** Document id of the pod being edited — drives the live-pod spot range. */
  editingPodDocId?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void> | void;
  /** Hands the RHF methods to the parent (used by admin AI-fill). */
  onReady?: (methods: UseFormReturn<PodFormValues>) => void;
  /** Admin hides "Save as Draft" once a pod exists (draft only affects create). */
  hideDraftOnEdit?: boolean;
  /**
   * Live preview column, rendered INSIDE this form's provider so it can watch
   * the values being typed. Given one, the form lays itself out in two columns;
   * omitted, it stays the single column a dialog needs.
   */
  preview?: ReactNode;
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
  dateFormatter,
  slotLabels,
  editingPodDocId,
  busy = false,
  error,
  onCancel,
  onSubmit,
  onReady,
  hideDraftOnEdit = false,
  preview,
}: Readonly<PodFormProps>) {
  const { t } = useTranslation();
  // Rebuilt when the language changes: a Zod message is baked in at schema
  // build time, so a schema memoised on `config` alone would keep showing the
  // language that was active when the form first mounted.
  const schema = useMemo(() => makePodSchema(config, t), [config, t]);
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

  // The pod's category comes from its club, so this picker persists nothing of
  // its own — it just narrows which clubs are offered, and does it above every
  // section so the category is chosen first (same order as the host apps).
  const [categoryFilter, setCategoryFilter] = useState<AdminCategoryValue>(EMPTY_CATEGORY);
  const selectedClubId = methods.watch('club_id');
  const clubsInCategory = useMemo(() => {
    const key = { superId: categoryFilter.super_id, subId: categoryFilter.sub_id };
    if (!key.superId || !key.subId) return clubs;
    return clubs.filter(
      (club: any) =>
        // The club already chosen always stays listed: a filter that hides it
        // leaves the Club select rendering blank over a value the form holds.
        String(club?.id) === selectedClubId ||
        (String(club?.super_category_id ?? '') === key.superId &&
          String(club?.category_id ?? '') === key.subId),
    );
  }, [clubs, categoryFilter.super_id, categoryFilter.sub_id, selectedClubId]);

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

  // In Auto Pod mode the category IS the field (there is no club to narrow);
  // otherwise it only filters which clubs are offered.
  const categoryField = config.autoPod ? (
    <AutoPodCategoryField />
  ) : (
    <PodCategoryFilter
      value={categoryFilter}
      onChange={setCategoryFilter}
      matchCount={clubsInCategory.length}
      clubCount={clubs.length}
    />
  );

  // One spacing for every block in the column — the category, the media, each
  // section, the error and the actions — rather than a margin per component.
  const fields = (
    <Stack spacing={2}>
      {categoryField}
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
