import { z } from 'zod';
import type { CmsPageInput } from '@duncit/gql-types';
import type { CmsPageRow } from '../../queries/pages';
import { CMS_COLLECTIONS } from '../../lib/labels';
import { httpsOrBlank } from '../../lib/rules';
import { isSitePath } from '@duncit/regex';

type Translate = (key: string) => string;

const KINDS = ['PAGE', 'COLLECTION_LIST', 'COLLECTION_DETAIL'] as const;

/** A PAGE needs an address; a template needs a collection instead. */
export const pageSchema = (t: Translate) =>
  z
    .object({
      kind: z.enum(KINDS),
      collection_type: z.union([z.enum(CMS_COLLECTIONS), z.literal('')]),
      title: z.string().trim().min(1, t('websiteApp.cms.pageForm.errTitle')).max(160, t('websiteApp.cms.pageForm.errTitle')),
      path: z.string().trim().toLowerCase(),
      seo_title: z.string().trim().max(160),
      seo_description: z.string().trim().max(320),
      seo_image: httpsOrBlank(t('websiteApp.cms.pageForm.errUrl')),
      canonical_url: httpsOrBlank(t('websiteApp.cms.pageForm.errUrl')),
      noindex: z.boolean(),
      show_header: z.boolean(),
      show_footer: z.boolean(),
      sort_order: z.coerce.number().int().min(0),
      head_html: z.string(),
      custom_css: z.string(),
      custom_js: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.kind === 'PAGE' && !isSitePath(values.path)) {
        ctx.addIssue({ code: 'custom', path: ['path'], message: t('websiteApp.cms.pageForm.errPath') });
      }
      if (values.kind !== 'PAGE' && !values.collection_type) {
        ctx.addIssue({ code: 'custom', path: ['collection_type'], message: t('websiteApp.cms.pageForm.errCollection') });
      }
    });

export type PageFormValues = z.input<ReturnType<typeof pageSchema>>;
export type PageFormOutput = z.output<ReturnType<typeof pageSchema>>;

/** A new page started from a shortcut (an error page): its address and title, kept out of search. */
export interface PagePreset {
  path: string;
  title: string;
}

export const toPageFormValues = (page: CmsPageRow | null, preset?: PagePreset | null): PageFormValues => ({
  kind: page?.kind ?? 'PAGE',
  collection_type: page?.collection_type ?? '',
  title: page?.title ?? preset?.title ?? '',
  path: page?.path ?? preset?.path ?? '',
  seo_title: page?.seo.title ?? '',
  seo_description: page?.seo.description ?? '',
  seo_image: page?.seo.og_image_url ?? '',
  canonical_url: page?.seo.canonical_url ?? '',
  noindex: page?.seo.noindex ?? Boolean(preset),
  show_header: page?.show_header ?? true,
  show_footer: page?.show_footer ?? true,
  sort_order: page?.sort_order ?? 0,
  head_html: page?.head_html ?? '',
  custom_css: page?.custom_css ?? '',
  custom_js: page?.custom_js ?? '',
});

export const toPageInput = (values: PageFormOutput): CmsPageInput => ({
  kind: values.kind,
  collection_type: values.kind === 'PAGE' || values.collection_type === '' ? null : values.collection_type,
  title: values.title,
  path: values.kind === 'PAGE' ? values.path : '',
  seo: {
    title: values.seo_title,
    description: values.seo_description,
    og_image_url: values.seo_image,
    canonical_url: values.canonical_url,
    noindex: values.noindex,
  },
  show_header: values.show_header,
  show_footer: values.show_footer,
  head_html: values.head_html,
  custom_css: values.custom_css,
  custom_js: values.custom_js,
  sort_order: values.sort_order,
});
