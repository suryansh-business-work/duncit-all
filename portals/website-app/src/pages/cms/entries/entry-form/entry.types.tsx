import { z } from 'zod';
import type { CmsCollection, CmsEntryInput } from '@duncit/gql-types';
import type { CmsEntryData } from '../../queries/entries';
import { httpsOrBlank, optionalSlug, splitList } from '../../lib/rules';

type Translate = (key: string) => string;
type Entry = NonNullable<CmsEntryData['cmsEntry']>;

export const entrySchema = (t: Translate) =>
  z.object({
    title: z.string().trim().min(1, t('websiteApp.cms.entryForm.errTitle')).max(200, t('websiteApp.cms.entryForm.errTitle')),
    slug: optionalSlug(t('websiteApp.cms.entryForm.errSlug')),
    summary: z.string().trim().max(600),
    body_html: z.string(),
    cover_image_url: httpsOrBlank(t('websiteApp.cms.pageForm.errUrl')),
    category: z.string().trim().max(80),
    tags: z.string(),
    author_name: z.string().trim().max(120),
    /** A local date-time string from the picker, or empty. */
    published_at: z.string(),
    is_published: z.boolean(),
    sort_order: z.coerce.number().int().min(0),
    fields: z.array(z.object({ key: z.string().trim().min(1, t('websiteApp.cms.entryForm.errField')).max(60), value: z.string().trim().max(1000) })),
    seo_title: z.string().trim().max(160),
    seo_description: z.string().trim().max(320),
    seo_image: httpsOrBlank(t('websiteApp.cms.pageForm.errUrl')),
    noindex: z.boolean(),
  });

export type EntryFormValues = z.input<ReturnType<typeof entrySchema>>;
export type EntryFormOutput = z.output<ReturnType<typeof entrySchema>>;

export const toEntryFormValues = (entry: Entry | null): EntryFormValues => ({
  title: entry?.title ?? '',
  slug: entry?.slug ?? '',
  summary: entry?.summary ?? '',
  body_html: entry?.body_html ?? '',
  cover_image_url: entry?.cover_image_url ?? '',
  category: entry?.category ?? '',
  tags: entry?.tags.join(', ') ?? '',
  author_name: entry?.author_name ?? '',
  published_at: entry?.published_at ?? '',
  is_published: entry?.is_published ?? false,
  sort_order: entry?.sort_order ?? 0,
  fields: entry?.fields.map((f) => ({ key: f.key, value: f.value })) ?? [],
  seo_title: entry?.seo.title ?? '',
  seo_description: entry?.seo.description ?? '',
  seo_image: entry?.seo.og_image_url ?? '',
  noindex: entry?.seo.noindex ?? false,
});

export const toEntryInput = (values: EntryFormOutput, collection: CmsCollection): CmsEntryInput => ({
  collection_type: collection,
  title: values.title,
  slug: values.slug || null,
  summary: values.summary,
  body_html: values.body_html,
  cover_image_url: values.cover_image_url,
  category: values.category,
  tags: splitList(values.tags),
  author_name: values.author_name,
  fields: values.fields,
  published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
  is_published: values.is_published,
  sort_order: values.sort_order,
  seo: { title: values.seo_title, description: values.seo_description, og_image_url: values.seo_image, noindex: values.noindex },
});
