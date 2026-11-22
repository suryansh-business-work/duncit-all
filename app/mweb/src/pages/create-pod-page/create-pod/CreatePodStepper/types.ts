import type { DraftAutosaveHandle } from '@duncit/utils';
import type { buildCreatePodInput, buildModerationInput, serializeDraft } from '../create-pod.form';
import type {
  CreatePodCategoryIcon,
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

/** `keepalive`: the page is unloading, so the save has to outlive it. */
export interface DraftSaveOptions {
  keepalive?: boolean;
}

export interface CreatePodStepperProps {
  initialValues: CreatePodFormValues;
  initialStep: number;
  /** The draft this visit writes to. A new pod's id is minted on the device,
   * so it is in the URL before the first save creates the draft. */
  initialDraftId: string;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  venues: CreatePodVenue[];
  products: CreatePodProduct[];
  /** SUB-level categories with their admin-set minimum pax. */
  subCategories: CreatePodSubCategory[];
  /** SUB- and CATEGORY-level icons, for the What step's category tiles. */
  categoryIcons?: CreatePodCategoryIcon[];
  hostCategories: CreatePodHostCategory[];
  viewerUserId: string;
  onSaveDraft: (draftId: string, payload: DraftPayload, options?: DraftSaveOptions) => Promise<string>;
  onModerate: (input: ReturnType<typeof buildModerationInput>) => Promise<PodModerationResult>;
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
  /** Set when the host arrives from a confirmed Pod Request: step 3 keeps
   * this venue on offer whatever the club matches. */
  pinnedVenueId?: string;
  /** The venue picked with "Pick This Venue for Pod": while the form is on it,
   * the pod stays physical and Where & when offers that venue alone. */
  pickedVenueId?: string;
  /** The autosave's status and a save to await before leaving — for the
   * page's corner indicator and its close button. */
  onAutosave?: (handle: DraftAutosaveHandle) => void;
}
