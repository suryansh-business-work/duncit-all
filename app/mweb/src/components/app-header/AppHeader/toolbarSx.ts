import { APP_SHELL_MAX_WIDTH } from '../../../app/appLayout';

/** The header toolbar's layout; the bottom padding tightens when the greeting
 * row follows it. */
export const toolbarSx = (showGreeting: boolean) => ({
  width: '100%',
  maxWidth: APP_SHELL_MAX_WIDTH,
  mx: 'auto',
  gap: 1,
  px: 2,
  pt: 1,
  pb: showGreeting ? 1 : 1.5,
  minHeight: 56,
  boxSizing: 'border-box',
} as const);
