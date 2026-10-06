import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HistoryIcon from '@mui/icons-material/History';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { useSetBreadcrumbs, useTranslation } from '@duncit/shell';
import { CMS_SITE, type CmsSiteData } from '../queries/sites';
import { COLLECTION_SLUG, useCmsLabels } from '../lib/labels';
import WorkspaceTab from './WorkspaceTab';
import SiteRevisionsDialog from './SiteRevisionsDialog';

/** One website: its pages, fragments, collections, design system and settings. */
export default function SiteWorkspacePage() {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const { siteId = '' } = useParams();
  const { data, loading, error, refetch } = useQuery<CmsSiteData>(CMS_SITE, { variables: { id: siteId }, skip: !siteId });
  const site = data?.cmsSite ?? null;
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  const items = useMemo<DuncitTabItem<string>[]>(
    () => [
      { value: 'pages', label: t('websiteApp.cms.tabs.pages') },
      { value: 'fragments', label: t('websiteApp.cms.tabs.fragments') },
      ...(site?.collections ?? []).map((collection) => ({ value: COLLECTION_SLUG[collection], label: labels.collection[collection] })),
      { value: 'reels', label: t('websiteApp.cms.tabs.reels') },
      { value: 'design', label: t('websiteApp.cms.tabs.design') },
      { value: 'code', label: t('websiteApp.cms.tabs.code') },
      { value: 'settings', label: t('websiteApp.cms.tabs.settings') },
    ],
    [labels, site?.collections, t],
  );
  const tabs = useTabParam<string>({ items, fallback: 'pages' });
  useSetBreadcrumbs(site ? [{ label: site.name }] : null);

  if (loading && !site) return <Skeleton variant="rounded" height={240} />;
  if (error) return <Alert severity="error">{t('websiteApp.cms.loadFailed')}</Alert>;
  if (!site) return <Alert severity="warning">{t('websiteApp.cms.notFound')}</Alert>;

  const liveDomain = site.domains[0];
  return (
    <Stack spacing={2}>
      <PageHeader
        title={site.name}
        subtitle={site.domains.join(', ') || t('websiteApp.cms.noDomain')}
        titleWeight={700}
        actions={
          <Stack direction="row" spacing={1}>
            <DuncitButton variant="outlined" startIcon={<HistoryIcon />} onClick={() => setRevisionsOpen(true)} data-testid="cms-site-revisions">
              {t('websiteApp.cms.revisions.open')}
            </DuncitButton>
            {liveDomain && (
              <DuncitButton
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={`https://${liveDomain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('websiteApp.cms.viewLive')}
              </DuncitButton>
            )}
          </Stack>
        }
      />
      <DuncitTabs {...tabs} variant="scrollable" />
      <WorkspaceTab tab={tabs.value} site={site} onSiteChanged={() => refetch()} />
      <SiteRevisionsDialog site={site} open={revisionsOpen} onClose={() => setRevisionsOpen(false)} />
    </Stack>
  );
}
