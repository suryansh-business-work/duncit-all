import { parse } from 'graphql';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  MY_PUBLIC_PAGE_QUERY,
  PUBLIC_PAGE_POSTER_QUERY,
  PUBLISH_PUBLIC_PAGE_MUTATION,
  publicPageErrorKey,
  type PublicPageInsights,
  type PublicPageKind,
  type PublicPageLink,
} from '@duncit/utils';

import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

/**
 * The publish card's round trips. The documents come from @duncit/utils as
 * strings — the same ones mWeb sends — and are parsed once here, exactly as
 * services/share-link.ts does, so they need no native codegen.
 */
const MY_PUBLIC_PAGE = parse(MY_PUBLIC_PAGE_QUERY);
const PUBLISH_PUBLIC_PAGE = parse(PUBLISH_PUBLIC_PAGE_MUTATION);
const PUBLIC_PAGE_POSTER = parse(PUBLIC_PAGE_POSTER_QUERY);

const QR_DATA_PREFIX = /^data:image\/png;base64,/;

interface PageVars {
  kind: PublicPageKind;
  refId: string | null;
}

export async function fetchPublicPage(
  kind: PublicPageKind,
  refId: string | null,
  days: number,
): Promise<PublicPageInsights> {
  const data = await graphqlRequest<
    { myPublicPage: PublicPageInsights },
    PageVars & { days: number }
  >(MY_PUBLIC_PAGE, { kind, refId, days }, { auth: true });
  return data.myPublicPage;
}

export async function publishPublicPage(
  kind: PublicPageKind,
  refId: string | null,
): Promise<PublicPageLink> {
  const data = await graphqlRequest<{ publishPublicPage: PublicPageLink }, PageVars>(
    PUBLISH_PUBLIC_PAGE,
    { kind, refId },
    { auth: true },
  );
  return data.publishPublicPage;
}

export async function fetchPosterBase64(
  kind: PublicPageKind,
  refId: string | null,
  copy: { headline: string; footer: string },
): Promise<string> {
  const data = await graphqlRequest<
    { myPublicPagePosterPdfBase64: string },
    PageVars & { copy: { headline: string; footer: string } }
  >(PUBLIC_PAGE_POSTER, { kind, refId, copy }, { auth: true });
  return data.myPublicPagePosterPdfBase64;
}

/**
 * Write a base64 file to the cache and hand it to the OS share sheet — the
 * pattern hooks/checkoutRequests.ts uses for the payment invoice. False when
 * there was nothing to save or the device has no share sheet, so the caller
 * tells the user instead of the file silently going nowhere.
 */
export async function shareBase64File(
  base64: string,
  fileName: string,
  mimeType: string,
): Promise<boolean> {
  if (!base64 || !(await Sharing.isAvailableAsync())) return false;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType });
  return true;
}

/** The QR's PNG bytes without the data-URL prefix the server sends. */
export const qrBase64 = (dataUrl: string): string => dataUrl.replace(QR_DATA_PREFIX, '');

/**
 * The sentence for a failed load or publish. Native's client throws an
 * ApiError carrying the GraphQL extensions, which the shared helper reads off
 * an `errors` list — so the code is handed over in that shape and the
 * code→sentence mapping stays in one place (@duncit/utils).
 */
export function publicPageNativeErrorKey(err: unknown, fallbackKey: string): string {
  const shaped = err instanceof ApiError ? { errors: [{ extensions: err.extensions }] } : err;
  return publicPageErrorKey(shaped, fallbackKey);
}
