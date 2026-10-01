const STORAGE_KEY = 'duncit_locale';

export function storedLocale(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    // Private mode / disabled storage must not break rendering.
    return null;
  }
}

export function persistLocale(code: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    /* best effort */
  }
}
