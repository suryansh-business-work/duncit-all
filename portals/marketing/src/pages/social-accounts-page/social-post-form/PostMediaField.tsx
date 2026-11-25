import { useEffect, useRef } from 'react';
import { useController, type Control } from 'react-hook-form';
import { MediaListField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import type { SocialPostMedia } from '../publish.queries';
import { measureMedia } from './measureMedia';
import { mediaFromUrl, type SocialPostFormValues } from './social-post.types';

/** Where the composer's uploads are filed. */
const FOLDER = '/marketing/social';

/** The list as the shared field holds it: one URL per line, in order. */
export const mediaToLines = (media: readonly SocialPostMedia[]) => media.map((item) => item.url).join('\n');

/**
 * The lines back into items. A URL already in the list keeps what was
 * recorded of it (its kind, and what it measured); a new one is read off its
 * address.
 */
export function linesToMedia(lines: string, known: readonly SocialPostMedia[]): SocialPostMedia[] {
  const byUrl = new Map(known.map((item) => [item.url, item]));
  return lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url) => byUrl.get(url) ?? mediaFromUrl(url));
}

const unmeasured = (item: SocialPostMedia) => !item.width && !item.duration_s;

/**
 * The post's media, in order: the shared ordered list — add, replace, move
 * up or down, remove — bound to the form's typed items. Each new piece is
 * measured once in the background, so the shape and length rules can speak
 * before the post is sent.
 */
export default function PostMediaField({ control }: Readonly<{ control: Control<SocialPostFormValues> }>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name: 'media' });
  // The list as it is when a measurement comes back, which may be after the person changed it.
  const latest = useRef({ value: field.value, onChange: field.onChange });
  useEffect(() => {
    latest.current = { value: field.value, onChange: field.onChange };
  });
  const tried = useRef(new Set<string>());

  useEffect(() => {
    for (const item of field.value.filter(unmeasured)) {
      if (tried.current.has(item.url)) continue;
      tried.current.add(item.url);
      measureMedia(item).then((size) => {
        if (!size) return;
        const { value, onChange } = latest.current;
        onChange(value.map((piece) => (piece.url === item.url ? { ...piece, ...size } : piece)));
      });
    }
  }, [field.value]);

  return (
    <MediaListField
      label={t('marketing.social.postMedia')}
      value={mediaToLines(field.value)}
      onChange={(lines) => field.onChange(linesToMedia(lines, field.value))}
      folder={FOLDER}
      buttonLabel={t('marketing.social.addMedia')}
      helperText={fieldState.error?.message ?? t('marketing.social.postMediaHint')}
    />
  );
}
