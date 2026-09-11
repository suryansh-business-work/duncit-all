/**
 * The pill segmented control of the gift-card pages: a soft track with the
 * selected segment filled green. Styles `DuncitTabs` (the Buy / My cards strip)
 * and the "For myself / Send as a gift" toggle alike, so both read as one
 * control. Native twin: components/gift-cards/GiftCardSegmented.
 */
export const SEGMENTED_TABS_SX = {
  minHeight: 48,
  p: 0.5,
  borderRadius: 999,
  bgcolor: 'action.hover',
  '& .MuiTabs-indicator': { display: 'none' },
  '& .MuiTab-root': {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
  '& .MuiTab-root.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
} as const;

/** A selectable pill sitting on a card (theme groups, denominations): soft
 * when idle, green when picked. */
export const CARD_PILL_SX = { height: 36, minHeight: 36, px: 0.75, fontWeight: 600 } as const;
export const CARD_PILL_IDLE_SX = { ...CARD_PILL_SX, bgcolor: 'action.hover' } as const;

export const SEGMENTED_TOGGLE_SX = {
  p: 0.5,
  gap: 0.5,
  borderRadius: 999,
  bgcolor: 'action.hover',
  '& .MuiToggleButton-root': {
    flex: 1,
    minHeight: 40,
    border: 0,
    borderRadius: '999px !important',
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
  '& .MuiToggleButton-root.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
  '& .MuiToggleButton-root.Mui-selected:hover': { bgcolor: 'primary.dark' },
} as const;
