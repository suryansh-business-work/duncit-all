import { z } from 'zod';

/** The translator this form and its schema read their copy from (rule 38). */
export type PodContentTranslate = (key: string) => string;

/** The pod content fields this shared form can edit. The host portal enables a
 *  subset (name/description/images); everything not listed renders disabled. */
export type PodField = 'pod_title' | 'pod_description' | 'pod_images_and_videos';

export interface PodMedia {
  url: string;
  type?: string | null;
}

/** Built from the console's translator: a validation message is copy the
 *  operator reads, so it follows their language (rule 38). */
export const buildPodContentSchema = (t: PodContentTranslate) =>
  z.object({
    pod_title: z.string().trim().min(2, t('shell.podContent.nameMin')),
    pod_description: z.string().trim().min(1, t('shell.podContent.descriptionRequired')),
    pod_images_and_videos: z.array(
      z.object({ url: z.string().min(1), type: z.string().nullish() }),
    ),
  });

export type PodContentValues = z.infer<ReturnType<typeof buildPodContentSchema>>;

export interface ReadOnlyContextItem {
  label: string;
  value: string;
}
