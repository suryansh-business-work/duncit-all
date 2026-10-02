import { consentAllows, readWebConsent, whenWebConsentAllows } from './consent';
import {
  captureShortLinkAttribution,
  installAttributionLinkDecorator,
  rememberShortLinkAttribution,
} from './short-link-attribution';

/**
 * Short-link attribution as every web surface starts it — the websites, mWeb
 * and the portals — with the visitor's consent applied in one place.
 *
 * The landing is always reported, so the link's click count stays honest; the
 * server stores it with nothing that identifies the visitor unless they have
 * allowed marketing attribution. Only with that consent is the click id kept
 * on the device. A visitor who allows it after the page has loaded (the banner
 * is answered later) gets this landing remembered at that moment.
 *
 * Resolves to the click id this browser is attributed to, if any. `search` is
 * the landing's query string — passed in by a surface whose router may rewrite
 * the address before this runs.
 */
export async function startWebShortLinkAttribution(
  serverUrl: string,
  search: string = globalThis.location.search,
  doc: Document = globalThis.document
): Promise<string | null> {
  const consent = consentAllows(readWebConsent(doc), 'marketing');
  installAttributionLinkDecorator(doc);
  const clickId = await captureShortLinkAttribution({
    search,
    referrer: doc.referrer,
    serverUrl,
    consent,
  });
  if (!consent) {
    whenWebConsentAllows('marketing', () => rememberShortLinkAttribution(search, clickId), doc);
  }
  return clickId;
}
