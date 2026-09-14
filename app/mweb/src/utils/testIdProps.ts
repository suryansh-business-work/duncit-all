/**
 * `data-testid` for an MUI slot's props object (`slotProps.htmlInput`, `.paper`,
 * `.badge`, a picker's `.textField`, …).
 *
 * Slot prop types do not list `data-*` keys, so written inline the key fails
 * TypeScript's excess-property check. Spread from here it type-checks and
 * still lands on the DOM element unchanged.
 */
export function testIdProps(id: string): { 'data-testid': string } {
  return { 'data-testid': id };
}
