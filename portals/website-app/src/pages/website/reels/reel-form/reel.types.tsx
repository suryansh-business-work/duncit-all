import { z } from 'zod';
import type { WebsiteNavSite, WebsiteReelInput } from '@duncit/gql-types';
import type { WebsiteReelRow } from '../queries';

type Translate = (key: string) => string;

/** Built per render so every message follows the console's language. */
export const reelSchema = (t: Translate) =>
  z.object({
    title: z.string().trim().max(80, t('websiteApp.reels.errTitleMax')),
    description: z.string().trim().max(240, t('websiteApp.reels.errDescriptionMax')),
    video_url: z.string().trim().min(1, t('websiteApp.reels.errVideo')),
    file_size_bytes: z.number().int().min(0),
    sort_order: z.coerce
      .number({ error: t('websiteApp.reels.errSortOrder') })
      .int(t('websiteApp.reels.errSortOrder'))
      .min(0, t('websiteApp.reels.errSortOrder')),
    is_active: z.boolean(),
  });

export type ReelFormValues = z.input<ReturnType<typeof reelSchema>>;
export type ReelFormOutput = z.output<ReturnType<typeof reelSchema>>;

export const blankReelValues = (): ReelFormValues => ({
  title: '',
  description: '',
  video_url: '',
  file_size_bytes: 0,
  sort_order: 0,
  is_active: true,
});

export const toReelFormValues = (reel: WebsiteReelRow): ReelFormValues => ({
  title: reel.title,
  description: reel.description,
  video_url: reel.video_url,
  file_size_bytes: reel.file_size_bytes,
  sort_order: reel.sort_order,
  is_active: reel.is_active,
});

export const toReelInput = (values: ReelFormOutput, site: WebsiteNavSite): WebsiteReelInput => ({
  site,
  title: values.title,
  description: values.description,
  video_url: values.video_url,
  file_size_bytes: values.file_size_bytes,
  sort_order: values.sort_order,
  is_active: values.is_active,
});
