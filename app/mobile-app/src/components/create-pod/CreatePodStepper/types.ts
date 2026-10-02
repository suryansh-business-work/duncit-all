import type { buildCreatePodInput, buildModerationInput, serializeDraft } from '../create-pod.form';
import type {
  ClubAdminStepperMode,
  CreatePodClub,
  CreatePodFinance,
  CreatePodFormValues,
  CreatePodHostCategory,
  CreatePodLocation,
  CreatePodProduct,
  CreatePodSubCategory,
  CreatePodVenue,
  PodModerationResult,
} from '../create-pod.types';

export type DraftPayload = ReturnType<typeof serializeDraft>;

export interface CreatePodStepperProps {
  initialValues: CreatePodFormValues;
  initialStep: number;
  initialDraftId: string | null;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  venues: CreatePodVenue[];
  products: CreatePodProduct[];
  /** SUB-level categories with their admin-set minimum pax. */
  subCategories: CreatePodSubCategory[];
  hostCategories: CreatePodHostCategory[];
  viewerUserId: string;
  finance: CreatePodFinance;
  onSaveDraft: (draftId: string | null, payload: DraftPayload) => Promise<string>;
  onModerate: (input: ReturnType<typeof buildModerationInput>) => Promise<PodModerationResult>;
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
  /**
   * Club Admin mode — the club is pinned, hosts may be assigned, and the last
   * step writes through the club-admin mutations. Absent for the host flow.
   *
   * The host's rolling autosave is off here; the Club Admin's draft is the
   * deliberate "Save as Draft" button, which writes the pod INACTIVE. Two
   * different things that happen to share a word — the portals draw the same
   * distinction.
   */
  clubAdmin?: ClubAdminStepperMode;
}
