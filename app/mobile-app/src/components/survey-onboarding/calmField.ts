/**
 * The calm field look the onboarding survey's raw Tamagui inputs share —
 * surface fill, hairline border, 14px corners (mWeb's themed OutlinedInput).
 * Spread onto `<Input>` / `<TextArea>`.
 */
export const CALM_FIELD = {
  backgroundColor: '$surface',
  borderColor: '$borderColor',
  borderRadius: 14,
} as const;
