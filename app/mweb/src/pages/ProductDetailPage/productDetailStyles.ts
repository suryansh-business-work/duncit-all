export const BACK_SX = {
  width: 40,
  height: 40,
  minHeight: 40,
  alignSelf: 'flex-start',
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
} as const;
export const PILL_SX = { height: 36, minHeight: 36, px: 0.5, fontWeight: 600 } as const;
export const IDLE_PILL_SX = { ...PILL_SX, bgcolor: 'background.paper' } as const;
