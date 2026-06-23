import { z } from 'zod';

/** The pod content fields this shared form can edit. The host portal enables a
 *  subset (name/description/images); everything not listed renders disabled. */
export type PodField = 'pod_title' | 'pod_description' | 'pod_images_and_videos';

export interface PodMedia {
  url: string;
  type?: string | null;
}

export const podContentSchema = z.object({
  pod_title: z.string().trim().min(2, 'Name must be at least 2 characters'),
  pod_description: z.string().trim().min(1, 'Description is required'),
  pod_images_and_videos: z.array(
    z.object({ url: z.string().min(1), type: z.string().nullish() }),
  ),
});

export type PodContentValues = z.infer<typeof podContentSchema>;

export interface ReadOnlyContextItem {
  label: string;
  value: string;
}
