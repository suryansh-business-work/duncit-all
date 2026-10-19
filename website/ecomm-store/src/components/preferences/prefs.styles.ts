/** Three equal choice tiles (colour mode, text size): icon above label, 56px tall. */
export const TOGGLE_GROUP_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 1,
  '& .MuiToggleButtonGroup-grouped': { border: 1, borderColor: 'divider', borderRadius: 2, m: 0 },
  '& .MuiToggleButton-root': { minHeight: 56, flexDirection: 'column', gap: 0.5 },
} as const;
