import {
  EVENT_REQUEST_NOTE_MAX,
  eventRequestDefaults,
  makeEventRequestSchema,
  type EventRequestValues,
} from '@duncit/forms/schemas';

/**
 * The optional note sent with "Request an event" — the shared rule, so mWeb
 * and native accept the same note (rules 27 + 56).
 */
export {
  EVENT_REQUEST_NOTE_MAX,
  eventRequestDefaults,
  makeEventRequestSchema,
  type EventRequestValues,
};

export interface RequestEventSheetProps {
  open: boolean;
  /** "Tell {name} you would …" — the line above the note. */
  body: string;
  sending: boolean;
  /** The localized failure, shown in the sheet. */
  error: string | null;
  onClose: () => void;
  /** Resolves true once sent; the sheet then clears. */
  onSubmit: (note: string) => Promise<boolean>;
}
