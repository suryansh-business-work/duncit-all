import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, DialogActions, Grid } from '@mui/material';
import { makePodSchema } from './schema';
import { PodFormDataProvider } from './context';
import CascadeEffect from './CascadeEffect';
import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import PodCategoryFilter from './PodCategoryFilter';
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
import { useTranslation } from './i18n/useTranslation';

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
  busy = false,
  error,
  onCancel,
  onSubmit,
  onReady,
  hideDraftOnEdit = false,
  preview,
}: Readonly<PodFormProps>) {
  const { t } = useTranslation();
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
    }),
    [config, clubsInCategory, venues, users, products, finance, getClubVenueIds, meetingPlatforms, onGenerateMeetingLink, onPickImage, onPickVideo, searchHosts, dateFormatter, slotLabels],
  );

  const submit = methods.handleSubmit(async (values) => {
    const draft = submitMode.current === 'draft';
    submitMode.current = 'publish';
    await onSubmit(values, { draft });
  });
  const busyOrSubmitting = busy || methods.formState.isSubmitting;
  const isEdit = !!methods.watch('pod_id');
  const showDraft = !(hideDraftOnEdit && isEdit);

  const fields = (
    <>
      <PodCategoryFilter
        value={categoryFilter}
        onChange={setCategoryFilter}
        matchCount={clubsInCategory.length}
        clubCount={clubs.length}
      />
      <PodSections />
      {/* `whiteSpace: pre-line` keeps a content refusal readable: it arrives as
          a headline followed by one line per rule broken. */}
      {error && (
        <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}
      <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
        <Button onClick={onCancel}>{t('podForm.common.cancel')}</Button>
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
    </>
  );

  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={data}>
        <form noValidate onSubmit={submit}>
          <CascadeEffect />
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
      </PodFormDataProvider>
    </FormProvider>
  );
}
