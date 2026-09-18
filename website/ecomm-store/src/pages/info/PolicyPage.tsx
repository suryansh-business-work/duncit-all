import { useParams } from 'react-router';
import { Paper, Stack, Typography } from '@mui/material';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import type { StoreSettings } from '../../graphql/settings';
import { RichHtml } from '../../components/RichHtml';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { NotFoundContent } from './NotFoundPage';

type PolicyField = 'shipping_policy_html' | 'returns_policy_html' | 'terms_html' | 'about_html';

const POLICIES: Record<string, { field: PolicyField; titleKey: string }> = {
  shipping: { field: 'shipping_policy_html', titleKey: 'ecommStore.pages.shipping' },
  returns: { field: 'returns_policy_html', titleKey: 'ecommStore.pages.returns' },
  terms: { field: 'terms_html', titleKey: 'ecommStore.pages.terms' },
  about: { field: 'about_html', titleKey: 'ecommStore.pages.about' },
};

const policyHtml = (settings: StoreSettings, field: PolicyField): string => settings[field];

/** /pages/:slug — the store's own shipping, returns, terms and about pages. */
export function PolicyPage() {
  const { t } = useStoreT();
  const { slug = '' } = useParams();
  const settings = useStoreSettings();
  const policy = Object.hasOwn(POLICIES, slug) ? POLICIES[slug] : undefined;
  const title = policy ? t(policy.titleKey) : '';
  usePageSeo(title);
  if (!policy) return <NotFoundContent />;
  const html = policyHtml(settings, policy.field);
  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h1">{title}</Typography>
      <Paper sx={{ p: { xs: 2, md: 4 } }}>
        {html.trim() ? <RichHtml html={html} /> : <Typography color="text.secondary">{t('ecommStore.pages.empty')}</Typography>}
      </Paper>
    </Stack>
  );
}
