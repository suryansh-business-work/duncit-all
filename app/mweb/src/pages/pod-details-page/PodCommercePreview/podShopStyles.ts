import { alpha, type Theme } from '@mui/material/styles';

/** A product row on the card: a soft tile, primary-tinted while it is in the cart. */
export const rowSx = (selected: boolean) => (theme: Theme) => ({
  alignItems: 'center',
  p: 1,
  borderRadius: '16px',
  bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : theme.palette.action.hover,
  transition: 'background-color 0.18s ease',
});
