export type RichTextChangeHandler = (html: string, text: string) => void;

/** One person the @mention list offers. */
export interface RichTextMentionItem {
  /** Stored as the mention's `data-id` — what an API reads to know who was mentioned. */
  id: string;
  /** Shown in the list and in the document as "@label". */
  label: string;
  /** A second line in the list (an email, a role). */
  description?: string | null;
}

/** Turns on @mentions: typing "@" opens a list of people found by `search`. */
export interface RichTextMentions {
  /** People matching what was typed after "@" ('' right after the "@"). */
  search: (query: string) => Promise<readonly RichTextMentionItem[]>;
}

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
  /**
   * @mention people (off when omitted). Mentions are saved as
   * `<span data-type="mention" data-id="…">`; existing ones always render.
   */
  mentions?: RichTextMentions;
}
