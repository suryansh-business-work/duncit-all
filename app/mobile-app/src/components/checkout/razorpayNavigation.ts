/**
 * Where a navigation inside the Razorpay checkout WebView should go.
 *
 * With `webview_intent: true` the hosted checkout lists the buyer's UPI apps and,
 * on a tap, navigates to a `upi://pay?…` link — or, on Android, an `intent://…`
 * link naming the app. A WebView cannot open either: it shows an error page and
 * the payment dies right there, which is the single most common way a UPI
 * payment "failed" in the app. Those links belong to the phone, so they are
 * handed to the OS; every http(s) page stays inside the sheet.
 */

const WEB_SCHEMES = new Set(['http', 'https', 'about', 'data', 'blob', 'javascript']);

/** The scheme of a URL, lower-cased; empty when there is none. */
export function schemeOf(url: string): string {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim());
  return match ? match[1].toLowerCase() : '';
}

/** Whether the WebView should hand this URL to the OS instead of loading it. */
export function isExternalPaymentUrl(url: string): boolean {
  const scheme = schemeOf(url);
  return scheme !== '' && !WEB_SCHEMES.has(scheme);
}

/**
 * The URL the OS can actually open. An Android `intent://HOST/PATH#Intent;scheme=upi;…;end`
 * link is rebuilt as `upi://HOST/PATH` — `Linking` cannot start an intent URI,
 * but every UPI app answers its scheme. Anything else is returned unchanged.
 */
export function externalUrlFor(url: string): string {
  if (schemeOf(url) !== 'intent') return url;
  const hashAt = url.indexOf('#Intent;');
  if (hashAt < 0) return url;
  const target = url.slice('intent://'.length, hashAt);
  const params = url.slice(hashAt + '#Intent;'.length).split(';');
  const scheme = params.find((p) => p.startsWith('scheme='))?.slice('scheme='.length);
  return scheme ? `${scheme}://${target}` : url;
}
