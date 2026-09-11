/**
 * The calm look shared by the support, ticket and chat screens: the 40px round
 * header button, a round green send button, a soft pill field and the bubble
 * corners. Native twins draw the same shapes with `$surface` / `$primary` /
 * `$soft`.
 */

/** The 40px round surface button of an inner page header (back, "…"). */
export const HEADER_BUTTON_SX = {
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  bgcolor: 'background.paper',
  color: 'text.primary',
} as const;

export const SEND_BUTTON_SX = {
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  '&:hover': { bgcolor: 'primary.dark' },
  '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
} as const;

export const PILL_FIELD_SX = {
  '& .MuiOutlinedInput-root': { borderRadius: '22px', bgcolor: 'action.hover', minHeight: 44 },
  '& fieldset': { border: 0 },
} as const;

/** A bubble's corners: 18 all round, with a 6px tail on the sender's side. */
export function bubbleRadiusSx(mine: boolean) {
  return {
    borderRadius: '18px',
    borderBottomRightRadius: mine ? '6px' : '18px',
    borderBottomLeftRadius: mine ? '18px' : '6px',
  };
}
