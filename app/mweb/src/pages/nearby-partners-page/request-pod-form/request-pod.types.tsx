import {
  POD_REQUEST_NOTE_MAX,
  makePodRequestNoteSchema,
  type PodRequestNoteValues,
} from '@duncit/forms/schemas';

/**
 * The optional note sent with a Pod Request — the shared rule, so the
 * Partners console, mWeb and native accept the same note (rules 27 + 40).
 */
export { POD_REQUEST_NOTE_MAX, makePodRequestNoteSchema, type PodRequestNoteValues };

export const podRequestNoteDefaults: PodRequestNoteValues = { note: '' };

export interface RequestPodDialogProps {
  /** The host or venue being asked; null keeps the dialog closed. */
  targetName: string | null;
  sending: boolean;
  /** The server's refusal (LIMIT_REACHED, CONFLICT), shown in the dialog. */
  error: string | null;
  onClose: () => void;
  /** Resolves true once sent; the dialog then closes and clears. */
  onSubmit: (note: string) => Promise<boolean>;
}
