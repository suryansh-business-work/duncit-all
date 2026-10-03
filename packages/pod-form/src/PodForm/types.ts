import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type {
  GenerateMeetingLinkInput,
  PodFormConfig,
  PodFormData,
  PodFormFinance,
  PodFormValues,
  PodOption,
  SearchPodHosts,
} from '../types';

export interface PodFormProps {
  initialValues: PodFormValues;
  config: PodFormConfig;
  clubs: any[];
  /** Cities for the club options' place tags (see PodFormData.locations). */
  locations?: PodFormData['locations'];
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
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void> | void;
  /** Hands the RHF methods to the parent (used by admin AI-fill). */
  onReady?: (methods: UseFormReturn<PodFormValues>) => void;
  /** Admin hides "Save as Draft" once a pod exists (draft only affects create). */
  hideDraftOnEdit?: boolean;
  /** Editing an existing row — the Auto Pod stepper's last button saves rather than rolls out. */
  editing?: boolean;
  /**
   * Live preview column, rendered INSIDE this form's provider so it can watch
   * the values being typed. Given one, the form lays itself out in two columns;
   * omitted, it stays the single column a dialog needs.
   */
  preview?: ReactNode;
}
