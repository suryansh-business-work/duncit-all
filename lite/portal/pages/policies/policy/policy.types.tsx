import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import { SETTING_BOUNDS } from '../../../../shared/limits';
import { countRule } from '../../../components/countRule';
import type { LiteAdminPolicy, LitePolicyInput } from '../../../graphql/policies';

export interface PolicyFormValues {
  title: string;
  slug: string;
  /** Rich-text HTML; an empty editor normalises to ''. */
  content: string;
  /** Kept as text in the form; parsed on submit. */
  sort_order: string;
  is_active: boolean;
}

/** The same ceilings the API applies. */
const MAX_TITLE = 120;
const MAX_CONTENT = 200_000;

export const emptyPolicyValues = (): PolicyFormValues => ({ title: '', slug: '', content: '', sort_order: '0', is_active: true });

export const policyValuesFrom = (policy: LiteAdminPolicy): PolicyFormValues => ({
  title: policy.title,
  slug: policy.slug,
  content: policy.content,
  sort_order: String(policy.sort_order),
  is_active: policy.is_active,
});

export const toPolicyInput = (values: PolicyFormValues): LitePolicyInput => ({
  title: values.title,
  slug: values.slug || null,
  content: values.content,
  sort_order: values.sort_order === '' ? 0 : Number(values.sort_order),
  is_active: values.is_active,
});

export const makePolicySchema = (t: Translate) => {
  const title = t('litePortal.policies.titleLabel');
  const content = t('litePortal.policies.content');
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, t('litePortal.validation.required', { vars: { field: title } }))
      .max(MAX_TITLE, t('litePortal.validation.max', { vars: { field: title, max: MAX_TITLE } })),
    slug: z.string().trim().max(80, t('litePortal.validation.max', { vars: { field: t('litePortal.common.slug'), max: 80 } })),
    content: z
      .string()
      .trim()
      .min(1, t('litePortal.validation.required', { vars: { field: content } }))
      .max(MAX_CONTENT, t('litePortal.validation.max', { vars: { field: content, max: MAX_CONTENT } })),
    sort_order: countRule(t, t('litePortal.common.sortOrder'), SETTING_BOUNDS.sortOrder, true),
    is_active: z.boolean(),
  });
};
