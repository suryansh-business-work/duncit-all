import { launchImageLibraryAsync, type ImagePickerAsset } from 'expo-image-picker';

import { uploadFile } from '@/services/upload';

/** A photo or video picked on the phone, with what the CRM's media mutations record about it. */
export interface PickedMedia {
  uri: string;
  name: string;
  /** The MIME type the picker reported; blank when it could not tell. */
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
}

/** The ImageKit folders the CRM portal files these uploads in. */
export const EMAIL_MEDIA_FOLDERS = {
  templateImages: 'crm/email-templates',
  attachments: 'crm/email-attachments',
  brand: 'crm/email-brand',
} as const;

const toPicked = (asset: ImagePickerAsset): PickedMedia => ({
  uri: asset.uri,
  name: asset.fileName || asset.uri.slice(asset.uri.lastIndexOf('/') + 1),
  mimeType: asset.mimeType ?? '',
  sizeBytes: asset.fileSize ?? null,
  width: asset.width || null,
  height: asset.height || null,
});

/**
 * Open the phone's photo picker (no permission prompt: the system picker
 * hands over only what is chosen). Nothing when the person backs out.
 */
export async function pickMedia(
  options: { multiple?: boolean; videos?: boolean } = {},
): Promise<PickedMedia[]> {
  const result = await launchImageLibraryAsync({
    mediaTypes: options.videos ? ['images', 'videos'] : ['images'],
    allowsMultipleSelection: Boolean(options.multiple),
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.map(toPicked);
}

/** Upload one picked file through Duncit's upload route; resolves to its stored URL. */
export const uploadPicked = (file: PickedMedia, folder: string): Promise<string> =>
  uploadFile(
    { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' },
    folder,
  );
