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
  /**
   * ImageKit folder for pictures inserted from the toolbar. Defaults to
   * `/rich-text`, which keeps document images clear of the venue/club/pod media
   * the other pickers write.
   */
  imageFolder?: string;
  /**
   * Offer the one-click AI improvement (default true). It calls the main
   * Duncit API, so a surface on another API (Duncit Lite) turns it off.
   */
  aiImprove?: boolean;
  /** Offer the toolbar's Insert picture (default true); it uploads through the main Duncit API's media picker. */
  images?: boolean;
}
