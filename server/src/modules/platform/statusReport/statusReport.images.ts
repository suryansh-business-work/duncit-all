import { logs } from '@observability/log';
import { uploadBase64Image } from '@modules/platform/upload/upload.service';

/**
 * Screenshots attached to a public problem report.
 *
 * They arrive INSIDE the mutation as base64 and are uploaded here, rather than
 * the browser being handed an upload ticket: the form has no session behind it,
 * and a credential that lets an anonymous visitor write to our storage is a far
 * bigger door than the one this feature needs open.
 *
 * Every failure is swallowed on purpose. The reporter is already having a bad
 * day; losing the sentence they typed because their screenshot was a HEIC the
 * Upload Settings do not allow would be the worst possible outcome. A dropped
 * image is logged and the report is still filed.
 */

/** Where the files land, so a Tech operator can find them by folder. */
const FOLDER = '/status-reports';
/** Enough to show a page, a console and a network tab. */
export const MAX_REPORT_IMAGES = 3;

export interface StatusReportImageInput {
  file_name: string;
  data: string;
  mime_type?: string | null;
}

async function uploadOne(image: StatusReportImageInput): Promise<string | null> {
  try {
    const result = await uploadBase64Image({
      fileBase64: image.data,
      fileName: image.file_name || 'screenshot.png',
      folder: FOLDER,
      mimeType: image.mime_type || 'image/png',
    });
    return result.url;
  } catch (error) {
    logs.server.warn('statusReport', 'screenshot', { fileName: image.file_name, error });
    return null;
  }
}

/** Hosted URLs for whatever made it up. Never throws, never blocks the report. */
export async function uploadReportImages(
  images: readonly StatusReportImageInput[] | null | undefined
): Promise<string[]> {
  if (!images?.length) return [];
  const urls: string[] = [];
  // Sequential rather than parallel: three images from one visitor is not worth
  // three concurrent uploads on a server that may already be the thing on fire.
  for (const image of images.slice(0, MAX_REPORT_IMAGES)) {
    const url = await uploadOne(image);
    if (url) urls.push(url);
  }
  return urls;
}
