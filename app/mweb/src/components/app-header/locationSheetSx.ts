/** The location sheet's search fields (state, locality): a 44px surface pill
 * on the sheet's ground. Native twin: the `$surface` pill searches in
 * components/LocationDialog. */
export const SHEET_SEARCH_SX = {
  '& .MuiOutlinedInput-root': { minHeight: 44, borderRadius: 999, bgcolor: 'background.paper' },
  '& input': { fontSize: 13 },
} as const;
