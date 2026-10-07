import type { PodRequestNoteValues } from '@duncit/forms/schemas';

/** The Request Pod form: one optional note (rule lives in @duncit/forms). */
export type RequestNoteValues = PodRequestNoteValues;

export const requestNoteDefaults: RequestNoteValues = { note: '' };

export interface RequestNoteFormProps {
  /** The host or venue being asked — the dialog's title. */
  targetName: string;
  sending: boolean;
  /** A server refusal (LIMIT_REACHED, CONFLICT) shown inside the dialog. */
  error: string | null;
  onSend: (values: RequestNoteValues) => void;
  onCancel: () => void;
}
