/** Checkout inputs sit on the card at the theme's own input look; only the
 * height and corner are the checkout's. Shared by every checkout's billing form. */
export const CHECKOUT_FIELD_SX = {
  '& .MuiOutlinedInput-root': { minHeight: 56, borderRadius: '14px' },
  '& .MuiInputBase-input, & .MuiSelect-select': { py: 1.45 },
  '& .MuiSelect-select': { display: 'flex', alignItems: 'center' },
  '& .MuiSelect-icon': { color: 'text.secondary' },
};
