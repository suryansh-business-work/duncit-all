import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';
import PodForm from '../PodForm';
import type {
  GenerateMeetingLinkInput,
  PodFormConfig,
  PodFormFinance,
  PodFormValues,
  PodOption,
  SearchPodHosts,
} from '../types';

export interface PodEditorDialogProps {
  open: boolean;
  /** True when editing an existing pod (drives the dialog title). */
  editing: boolean;
  onClose: () => void;
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
  onPickImage?: () => Promise<string | null>;
  onPickVideo?: () => Promise<string | null>;
  searchHosts?: SearchPodHosts;
  dateTimeFormat?: string;
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void> | void;
  onReady?: (methods: UseFormReturn<PodFormValues>) => void;
  hideDraftOnEdit?: boolean;
  /** Extra title-row content (e.g. the admin AI-fill button). */
  titleExtras?: ReactNode;
  /** Content rendered above the form (e.g. the club-admin host info alert). */
  intro?: ReactNode;
}

/** Shared "New Pod / Edit Pod" dialog shell around the common PodForm. */
export default function PodEditorDialog({
  open,
  editing,
  onClose,
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
  dateTimeFormat,
  onSubmit,
  onReady,
  hideDraftOnEdit,
  titleExtras,
  intro,
}: Readonly<PodEditorDialogProps>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <span>{editing ? 'Edit Pod' : 'New Pod'}</span>
        {titleExtras}
      </DialogTitle>
      <DialogContent dividers>
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
          dateTimeFormat={dateTimeFormat}
          busy={busy}
          error={error}
          onCancel={onClose}
          onSubmit={onSubmit}
          onReady={onReady}
          hideDraftOnEdit={hideDraftOnEdit}
        />
      </DialogContent>
    </Dialog>
  );
}
