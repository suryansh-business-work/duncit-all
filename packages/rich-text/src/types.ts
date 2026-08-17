export type RichTextChangeHandler = (html: string, text: string) => void;

export interface DuncitRichTextInputProps {
  /** Controlled HTML value. Pass an empty string for an empty editor. */
  value: string;
  /** Receives the normalized safe HTML and its plain-text snapshot. */
  onChange: RichTextChangeHandler;
  placeholder?: string;
  ariaLabel?: string;
  minHeight?: number;
  compact?: boolean;
  disabled?: boolean;
  /** Read-only content has no toolbar or AI action. */
  readOnly?: boolean;
  /** Borderless content rendering, primarily for chat messages. */
  bare?: boolean;
  /** Short task context sent with the current HTML when AI improves it. */
  aiContext?: string;
}
