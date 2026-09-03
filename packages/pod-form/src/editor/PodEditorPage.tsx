import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import type { UseFormReturn } from 'react-hook-form';
import PodForm from '../PodForm';
import PodPreview from '../preview/PodPreview';
import type {
  GenerateMeetingLinkInput,
  PodFormConfig,
  PodFormData,
  PodFormFinance,
  PodFormValues,
  PodOption,
  SearchPodHosts,
} from '../types';

export interface PodEditorPageProps {
  /** True when editing an existing pod (drives the heading). */
  editing: boolean;
  /** Small line above the heading, e.g. "Admin · Pods". */
  eyebrow: string;
  /** Where the back button and Cancel go. */
  onBack: () => void;
  backLabel: string;
  initialValues: PodFormValues;
  config: PodFormConfig;
  busy: boolean;
  error: string | null;
  clubs: any[];
  venues: any[];
  users?: any[];
  products?: any[];
  finance?: PodFormFinance;
  getClubVenueIds: (club: any) => string[];
  meetingPlatforms?: PodOption[];
  onGenerateMeetingLink?: (input: GenerateMeetingLinkInput) => Promise<string>;
  onPickImage?: NonNullable<PodFormData['onPickImage']>;
  onPickVideo?: NonNullable<PodFormData['onPickVideo']>;
  searchHosts?: SearchPodHosts;
  /** Admin-configured formatter from `useDateFormat()`; drives the slot calendar. */
  dateFormatter: PodFormData['dateFormatter'];
  /** Slot-picker copy — `shell.slots.*` in the portals (rule 38). */
  slotLabels: PodFormData['slotLabels'];
  /** Document id of the pod being edited — drives the live-pod spot range. */
  editingPodDocId?: string;
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void> | void;
  onReady?: (methods: UseFormReturn<PodFormValues>) => void;
  hideDraftOnEdit?: boolean;
  /** Extra heading-row content (e.g. the admin AI-fill button). */
  titleExtras?: ReactNode;
  /** Content rendered above the form (e.g. the club-admin host info alert). */
  intro?: ReactNode;
  /** Heading override — the Auto Pod editors say "New Auto Pod" here. Defaults
   * to New Pod / Edit Pod. */
  title?: string;
}

/**
 * Full-page "New Pod / Edit Pod" editor: the shared PodForm on the left and the
 * live member preview on the right.
 *
 * It replaced a `maxWidth="md"` dialog. A pod carries eight sections, a slot
 * calendar and a media gallery — the modal cut all of that down to a scrolling
 * sliver, and left no room at all to show the author what they were building.
 */
export default function PodEditorPage({
  editing,
  eyebrow,
  onBack,
  backLabel,
  initialValues,
  config,
  busy,
  error,
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
  dateFormatter,
  slotLabels,
  editingPodDocId,
  onSubmit,
  onReady,
  hideDraftOnEdit,
  titleExtras,
  intro,
  title,
}: Readonly<PodEditorPageProps>) {
  const defaultTitle = editing ? 'Edit Pod' : 'New Pod';
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: 'flex-start', sm: 'center' }
            }}>
            <Stack spacing={0.25}>
              <Typography
                variant="overline"
                sx={{
                  color: "text.secondary",
                  fontWeight: 800
                }}>
                {eyebrow}
              </Typography>
              <Typography variant="h6" sx={{
                fontWeight: 950
              }}>
                {title ?? defaultTitle}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              {titleExtras}
              <DuncitButton startIcon={<ArrowBackIcon />} onClick={onBack}>
                {backLabel}
              </DuncitButton>
            </Stack>
          </Stack>

          {intro}

          <PodForm
            initialValues={initialValues}
            config={config}
            clubs={clubs}
            venues={venues}
            users={users}
            products={products}
            finance={finance}
            getClubVenueIds={getClubVenueIds}
            meetingPlatforms={meetingPlatforms}
            onGenerateMeetingLink={onGenerateMeetingLink}
            onPickImage={onPickImage}
            onPickVideo={onPickVideo}
            searchHosts={searchHosts}
            dateFormatter={dateFormatter}
            slotLabels={slotLabels}
            editingPodDocId={editingPodDocId}
            busy={busy}
            error={error}
            onCancel={onBack}
            onSubmit={onSubmit}
            onReady={onReady}
            hideDraftOnEdit={hideDraftOnEdit}
            editing={editing}
            preview={<PodPreview />}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
