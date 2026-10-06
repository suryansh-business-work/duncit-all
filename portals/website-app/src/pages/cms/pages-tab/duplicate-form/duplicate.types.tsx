import { z } from 'zod';
import { sitePath } from '../../lib/rules';

type Translate = (key: string) => string;

export const duplicateSchema = (t: Translate) =>
  z.object({
    title: z.string().trim().min(1, t('websiteApp.cms.pageForm.errTitle')).max(160, t('websiteApp.cms.pageForm.errTitle')),
    path: sitePath(t('websiteApp.cms.pageForm.errPath')),
  });

export type DuplicateFormValues = z.input<ReturnType<typeof duplicateSchema>>;
export type DuplicateFormOutput = z.output<ReturnType<typeof duplicateSchema>>;

/** A copy is suggested next to the original: "About us (copy)" at /about-copy.
 * `copyTitle` is the translated title for the copy. */
export const toDuplicateValues = (copyTitle: string, path: string): DuplicateFormValues => ({
  title: copyTitle,
  path: path === '/' ? '/home-copy' : `${path}-copy`,
});
