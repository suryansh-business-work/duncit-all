import { z } from 'zod';
import type { CmsFragmentInput } from '@duncit/gql-types';
import type { CmsFragmentRow } from '../../queries/fragments';
import { slugField } from '../../lib/rules';

type Translate = (key: string) => string;

export const fragmentSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t('websiteApp.cms.fragmentForm.errName')).max(120, t('websiteApp.cms.fragmentForm.errName')),
    key: slugField(t('websiteApp.cms.fragmentForm.errKey')),
    kind: z.enum(['HEADER', 'FOOTER', 'SECTION']),
  });

export type FragmentFormValues = z.input<ReturnType<typeof fragmentSchema>>;
export type FragmentFormOutput = z.output<ReturnType<typeof fragmentSchema>>;

export const toFragmentFormValues = (fragment: CmsFragmentRow | null): FragmentFormValues => ({
  name: fragment?.name ?? '',
  key: fragment?.key ?? '',
  kind: fragment?.kind ?? 'SECTION',
});

export const toFragmentInput = (values: FragmentFormOutput): CmsFragmentInput => ({ ...values });
