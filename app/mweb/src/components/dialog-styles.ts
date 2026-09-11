/**
 * The calm dialog's pieces, shared by every confirm/notice dialog so they read
 * as one family: 20px gutters, the title at 18/600, the actions as two equal
 * pills along the bottom. The paper's 28px corners come from the theme. Native
 * twin: components/DuncitDialog (DialogHeader + ConfirmFooter).
 */
export const DIALOG_TITLE_SX = {
  fontSize: '1.125rem',
  fontWeight: 600,
  lineHeight: 1.3,
  px: 2.5,
  pt: 2.5,
  pb: 1,
} as const;

/** The body under the title — the same 20px gutters. */
export const DIALOG_CONTENT_SX = { px: 2.5 } as const;

/** Two equal pills, padded like the content above them. */
export const DIALOG_ACTIONS_SX = { gap: 1.5, px: 2.5, pb: 2.5, pt: 1 } as const;

/** One of the two action pills. 48px tall, so it clears the touch floor. */
export const DIALOG_PILL_SX = { flex: 1, minHeight: 48 } as const;
