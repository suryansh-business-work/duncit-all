import { useParams } from 'react-router';
import { Stack, Typography } from '@mui/material';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import type { StoreSettings } from '../../graphql/settings';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { PageBody, StorePageView } from './StorePageView';

type PolicyField = 'shipping_policy_html' | 'returns_policy_html' | 'terms_html' | 'about_html';

interface Policy {
  field: PolicyField;
  titleKey: string;
}

const POLICIES: Record<string, Policy> = {
  shipping: { field: 'shipping_policy_html', titleKey: 'ecommStore.pages.shipping' },
  returns: { field: 'returns_policy_html', titleKey: 'ecommStore.pages.returns' },
  terms: { field: 'terms_html', titleKey: 'ecommStore.pages.terms' },
  about: { field: 'about_html', titleKey: 'ecommStore.pages.about' },
};

const policyHtml = (settings: StoreSettings, field: PolicyField): string => settings[field];

/** One of the four built-in pages, whose copy lives in the store's settings. */
function BuiltInPolicy({ policy }: Readonly<{ policy: Policy }>) {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  const title = t(policy.titleKey);
  usePageSeo(title);
  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }} data-testid="policy-page">
      <Typography variant="h1">{title}</Typography>
      <PageBody html={policyHtml(settings, policy.field)} />
    </Stack>
  );
}

/** /pages/:slug — shipping, returns, terms and about, or any page the operator wrote. */
export function PolicyPage() {
  const { slug = '' } = useParams();
  const policy = Object.hasOwn(POLICIES, slug) ? POLICIES[slug] : undefined;
  if (policy) return <BuiltInPolicy policy={policy} />;
  return <StorePageView slug={slug} />;
}
