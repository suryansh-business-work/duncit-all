import { Controller, type Control } from 'react-hook-form';
import { MediaListField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import type { SocialPostMedia } from '../publish.queries';
import { mediaFromUrl, type SocialPostFormValues } from './social-post.types';

/** Where the composer's uploads are filed. */
const FOLDER = '/marketing/social';

/** The list as the shared field holds it: one URL per line, in order. */
export const mediaToLines = (media: readonly SocialPostMedia[]) => media.map((item) => item.url).join('\n');

/**
 * The lines back into items. A URL already in the list keeps the kind it was
 * recorded with; a new one is read off its address.
 */
export function linesToMedia(lines: string, known: readonly SocialPostMedia[]): SocialPostMedia[] {
  const kinds = new Map(known.map((item) => [item.url, item.type]));
  return lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url) => {
      const type = kinds.get(url);
      return type ? { url, type } : mediaFromUrl(url);
    });
}

/**
 * The post's media, in order: the shared ordered list — add, replace, move
 * up or down, remove — bound to the form's typed items.
 */
export default function PostMediaField({ control }: Readonly<{ control: Control<SocialPostFormValues> }>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="media"
      render={({ field, fieldState }) => (
        <MediaListField
          label={t('marketing.social.postMedia')}
          value={mediaToLines(field.value)}
          onChange={(lines) => field.onChange(linesToMedia(lines, field.value))}
          folder={FOLDER}
          buttonLabel={t('marketing.social.addMedia')}
          helperText={fieldState.error?.message ?? t('marketing.social.postMediaHint')}
        />
      )}
    />
  );
}
