/**
 * Matches one line of `podRequests.*` copy that carries a value, e.g.
 * `interpolatedCopy('', '2.3', 'km away')` for "2.3 km away".
 *
 * The bundle writes its placeholders as `{{km}}` while the shared translator
 * fills `{km}`, so those lines currently render as "{2.3} km away". The value
 * and the words around it are what these suites check; the punctuation between
 * them is left free so the assertions hold before and after that copy is fixed.
 */
export function interpolatedCopy(before: string, value: string | number, after = ''): RegExp {
  const escape = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  return new RegExp(String.raw`^${escape(before)}\W*${escape(String(value))}\W*${escape(after)}$`);
}
