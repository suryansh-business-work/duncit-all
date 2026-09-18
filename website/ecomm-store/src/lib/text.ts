/** The first value that is not blank — for "this field, else that one" copy. */
export const firstFilled = (...values: ReadonlyArray<string | null | undefined>): string =>
  values.find((value) => (value ?? '').trim() !== '') ?? '';
