/** Largest first, so a ranking reads top to bottom. A copy: Apollo owns the original. */
export function ranked<T>(rows: readonly T[], value: (row: T) => number): T[] {
  const copy = [...rows];
  copy.sort((a, b) => value(b) - value(a));
  return copy;
}
