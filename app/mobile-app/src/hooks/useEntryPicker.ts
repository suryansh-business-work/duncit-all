import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { mediaTypeOfMime, type ChallengeMediaType } from '@duncit/utils';

import type { PickedEntryFile } from '@/forms/challenge';
import { useTranslation } from '@/hooks/useTranslation';
import { useUploadLimits } from '@/hooks/useUploadLimits';

/** A pick that went through, or the sentence saying why it did not (null: cancelled). */
export type EntryPick = { file: PickedEntryFile } | { error: string } | null;

const LIBRARY_TYPES: Record<'IMAGE' | 'VIDEO', ImagePicker.MediaType> = {
  IMAGE: 'images',
  VIDEO: 'videos',
};

/** A file name for a gallery pick that arrived without one. */
const fallbackName = (extension: string) => ['entry', String(Date.now()), extension].join('.');

/**
 * Picks the file for a challenge submission. Photos and videos come from the
 * gallery, audio from the files app; either way the pick is checked against
 * what the tool accepts and the admin's upload caps before it reaches the form.
 */
export function useEntryPicker(accepted: ChallengeMediaType[]) {
  const { t } = useTranslation();
  const limits = useUploadLimits();

  const check = (file: PickedEntryFile, size: number | null | undefined): EntryPick => {
    const kind = mediaTypeOfMime(file.type);
    if (!kind || !accepted.includes(kind))
      return { error: t('mweb.challenge.tools.errors.fileType') };
    const tooLarge = limits.tooLarge({ name: file.name, mimeType: file.type, size });
    return tooLarge ? { error: tooLarge } : { file };
  };

  const fromLibrary = async (): Promise<EntryPick> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { error: t('mweb.challenge.tools.errors.photoAccess') };
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (['IMAGE', 'VIDEO'] as const)
        .filter((k) => accepted.includes(k))
        .map((k) => LIBRARY_TYPES[k]),
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;
    const video = asset.type === 'video';
    return check(
      {
        uri: asset.uri,
        name: asset.fileName ?? fallbackName(video ? 'mp4' : 'jpg'),
        type: asset.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'),
      },
      asset.fileSize,
    );
  };

  const fromFiles = async (): Promise<EntryPick> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;
    return check(
      { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'audio/mpeg' },
      asset.size,
    );
  };

  return {
    /** Offered when the tool takes photos or videos. */
    fromLibrary: accepted.includes('IMAGE') || accepted.includes('VIDEO') ? fromLibrary : null,
    /** Offered when the tool takes audio. */
    fromFiles: accepted.includes('AUDIO') ? fromFiles : null,
  };
}
