/**
 * The header's round actions (search, bell, avatar, survey logout): a 40px
 * surface circle on the page ground — borderless in light, a hairline in dark
 * (`--duncit-card-border`). The hover keeps the surface, so a tap on a touch
 * screen never leaves a grey "stuck hover" behind. Native twin: the 40px
 * `$surface` circles in components/AppHeader.
 */
export const HEADER_ROUND_BUTTON_SX = {
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  p: 0,
  flex: '0 0 auto',
  color: 'text.primary',
  bgcolor: 'background.paper',
  border: '1px solid var(--duncit-card-border)',
  '&:hover': { bgcolor: 'background.paper' },
} as const;
