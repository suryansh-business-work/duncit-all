import type { Theme } from '@mui/material/styles';
import type { NodeTone } from '../../node-kinds';

/** The colour a tone paints with, off the live theme so both modes read right. */
export function toneColor(theme: Theme, tone: NodeTone): string {
  switch (tone) {
    case 'primary':
      return theme.palette.primary.main;
    case 'info':
      return theme.palette.info.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'secondary':
      return theme.palette.secondary.main;
    default:
      return theme.palette.text.secondary;
  }
}
