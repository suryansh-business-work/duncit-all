import * as ImagePicker from 'expo-image-picker';
import { CRM_LEAD_MEDIA_TYPES } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';
import { uploadFile } from '@/services/upload';
import { errorMessage } from '@/utils/errors';

/** One uploaded file, in the shape the lead media mutations take. */
export interface UploadedImage {
  url: string;
  name: string;
  mime_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
}

type Asset = ImagePicker.ImagePickerAsset;

/** Pictures chosen from the phone's library (none when the person backs out). */
export async function pickImages(multiple: boolean): Promise<Asset[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: multiple,
  });
  return result.canceled ? [] : (result.assets ?? []);
}

/** The file's own name, or the last part of its path when the library gives none. */
const fileNameOf = (asset: Asset): string =>
  asset.fileName || asset.uri.split('/').pop() || asset.assetId || 'image';

/**
 * Upload picked pictures the way the portal does: refuse a type the lead's
 * library does not take (naming the file), upload the rest one by one through
 * the app's ImageKit route, and report each stored URL with its type, size and
 * dimensions. A file that fails does not stop the others.
 */
export async function uploadImages(
  assets: readonly Asset[],
  folder: string,
  t: Translate,
): Promise<{ uploaded: UploadedImage[]; errors: string[] }> {
  const uploaded: UploadedImage[] = [];
  const errors: string[] = [];
  for (const asset of assets) {
    const name = fileNameOf(asset);
    const type = asset.mimeType ?? '';
    if (!(CRM_LEAD_MEDIA_TYPES as readonly string[]).includes(type)) {
      errors.push(t('crm.media.wrongType', { vars: { name } }));
      continue;
    }
    try {
      const url = await uploadFile({ uri: asset.uri, name, type }, folder);
      uploaded.push({
        url,
        name,
        mime_type: type,
        size_bytes: asset.fileSize ?? null,
        width: asset.width || null,
        height: asset.height || null,
      });
    } catch (err) {
      errors.push(`${name}: ${errorMessage(err, t('crmApp.common.saveFailed'))}`);
    }
  }
  return { uploaded, errors };
}
