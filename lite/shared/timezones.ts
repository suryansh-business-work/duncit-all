/** Every zone this engine lists by name, or none where it cannot say. */
function listedTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    // Older engines throw on an unknown key; the zones kept by the caller still show.
    return [];
  }
}

/** A zone this engine can show times in: any IANA name or alias it knows (Asia/Kolkata, UTC, ...). The API checks the same way. */
export function isTimeZone(zone: string): boolean {
  if (!zone) return false;
  try {
    return Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone !== '';
  } catch {
    return false;
  }
}

/**
 * The zones a picker offers: every one the engine lists, plus each of `keep`
 * (the saved zone, the device's) that it knows only by another name. V8 lists
 * Asia/Calcutta but not Asia/Kolkata, and no UTC, so without this a saved
 * Asia/Kolkata would be missing from its own picker and refused on save.
 */
export function timeZoneOptions(keep: readonly string[] = []): string[] {
  const zones = new Set(listedTimeZones());
  for (const zone of keep) if (isTimeZone(zone)) zones.add(zone);
  return [...zones].sort((a, b) => a.localeCompare(b));
}
