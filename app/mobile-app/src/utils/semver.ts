/**
 * Minimal semver comparison for the app force-update gate. Pure (no I/O) so
 * every branch is unit-testable. Only major.minor.patch are compared — any
 * pre-release/build suffix (`-beta`, `+build`) and extra segments are ignored.
 */

type Triple = [number, number, number];

/**
 * Parse the numeric `major.minor.patch` core of a version string. Returns
 * `null` for an empty string or when a required segment isn't numeric — missing
 * trailing segments default to 0 (so "1.2" reads as 1.2.0).
 */
function parseSemver(version: string): Triple | null {
  const trimmed = version.trim();
  if (trimmed === '') return null;
  const cutAt = trimmed.search(/[-+]/);
  const core = cutAt === -1 ? trimmed : trimmed.slice(0, cutAt);
  const parts = core.split('.');
  const triple: Triple = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const value = Number.parseInt(parts[i] ?? '0', 10);
    if (Number.isNaN(value)) return null;
    triple[i] = value;
  }
  return triple;
}

/**
 * True only when `latest` is a valid, non-empty semver strictly greater than
 * `current`. An empty/invalid `latest` returns false so a server hiccup (blank
 * value) can never lock everyone out of the app. An unparseable `current`
 * degrades to 0.0.0 (treats the running build as the oldest possible).
 */
export function isOutdated(current: string, latest: string): boolean {
  const latestTriple = parseSemver(latest);
  if (latestTriple === null) return false;
  const currentTriple: Triple = parseSemver(current) ?? [0, 0, 0];
  const [lMajor, lMinor, lPatch] = latestTriple;
  const [cMajor, cMinor, cPatch] = currentTriple;
  if (lMajor !== cMajor) return lMajor > cMajor;
  if (lMinor !== cMinor) return lMinor > cMinor;
  if (lPatch !== cPatch) return lPatch > cPatch;
  return false;
}
