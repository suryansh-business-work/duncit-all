import type { buildCreatePodInput, buildModerationInput, serializeDraft } from '../create-pod.form';
import type {
  CreatePodClub,
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
  onSaveDraft: (draftId: string | null, payload: DraftPayload) => Promise<string>;
  onModerate: (input: ReturnType<typeof buildModerationInput>) => Promise<PodModerationResult>;
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
}
