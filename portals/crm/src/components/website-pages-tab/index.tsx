import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import {
  CRM_WEBSITE_PAGES,
  DELETE_CRM_WEBSITE_PAGE,
  FETCH_CRM_WEBSITE_PAGE_CONTENT,
  SCRAPE_CRM_WEBSITE_PAGES,
  type CrmEntityType,
  type CrmWebsitePage,
} from '../../api/websitePages.gql';
import { parseApiError } from '@duncit/utils';
import { ConfirmDialog } from '@duncit/dialogs';
import ExternalLink from '../ExternalLink';
import ScrapeDialog from './ScrapeDialog';
import WebsitePagesTable from './WebsitePagesTable';
import PageContentDialog from './PageContentDialog';
import { useTranslation } from '@duncit/shell';

interface Props {
  entity: CrmEntityType;
  leadId: string;
  website?: string | null;
}

/** Website tab: scrape a lead's site into a saved page list, fetch per-page content. */
export default function WebsitePagesTab({ entity, leadId, website }: Readonly<Props>) {
  const { t } = useTranslation();
  const variables = { entity_type: entity, lead_id: leadId };
  const { data, loading, error } = useQuery<{ crmWebsitePages: CrmWebsitePage[] }>(CRM_WEBSITE_PAGES, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const [scrapeMut, { loading: scraping }] = useMutation(SCRAPE_CRM_WEBSITE_PAGES, {
    refetchQueries: [{ query: CRM_WEBSITE_PAGES, variables }],
  });
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_CRM_WEBSITE_PAGE, {
    refetchQueries: [{ query: CRM_WEBSITE_PAGES, variables }],
  });

  const [fetchContent] = useMutation(FETCH_CRM_WEBSITE_PAGE_CONTENT);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [viewing, setViewing] = useState<CrmWebsitePage | null>(null);
  const [removing, setRemoving] = useState<CrmWebsitePage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<{ done: number; total: number } | null>(null);

  const pages = data?.crmWebsitePages ?? [];
  const unfetched = pages.filter((p) => p.status !== 'FETCHED');

  if (!website) {
    return (
      <Alert severity="info">
        No website on record for this lead. Open <strong>Edit</strong> and add a website to scrape its pages.
      </Alert>
    );
  }

  const doScrape = async (limit: number) => {
    setActionError(null);
    try {
      await scrapeMut({ variables: { ...variables, limit } });
      setScrapeOpen(false);
    } catch (err) {
      setActionError(parseApiError(err));
    }
  };

  /** Fetch content for every not-yet-fetched page, sequentially (kind to the site). */
  const fetchAll = async () => {
    setActionError(null);
    const targets = unfetched;
    setFetchProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i += 1) {
      try {
        await fetchContent({ variables: { id: targets[i].id } });
      } catch (err) {
        setActionError(parseApiError(err));
      }
      setFetchProgress({ done: i + 1, total: targets.length });
    }
    setFetchProgress(null);
  };

  const confirmDelete = async () => {
    if (!removing) return;
    try {
      await deleteMut({ variables: { id: removing.id } });
    } catch (err) {
      setActionError(parseApiError(err));
    }
    setRemoving(null);
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack
            direction="row"
            spacing={1.5}
            useFlexGap
            sx={{
              alignItems: "center",
              flexWrap: "wrap"
            }}>
            <LanguageIcon color="primary" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 800
              }}>{t('crm.common.website')}</Typography>
              <ExternalLink variant="body2" href={website} />
            </Box>
            <Chip size="small" variant="outlined" label={`${pages.length} page${pages.length === 1 ? '' : 's'} saved`} />
            <DuncitButton
              variant="outlined"
              startIcon={fetchProgress ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={fetchAll}
              disabled={!!fetchProgress || unfetched.length === 0}
            >
              {fetchProgress ? `Fetching ${fetchProgress.done}/${fetchProgress.total}` : `Fetch all (${unfetched.length})`}
            </DuncitButton>
            <DuncitButton variant="contained" startIcon={<TravelExploreIcon />} onClick={() => { setActionError(null); setScrapeOpen(true); }}>
              Scrape pages
            </DuncitButton>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      <Card>
        <CardContent>
          {loading && pages.length === 0 && (
            <Stack
              sx={{
                alignItems: "center",
                py: 4
              }}><CircularProgress /></Stack>
          )}
          {!loading && pages.length === 0 && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                py: 2,
                textAlign: 'center'
              }}>
              No pages yet. Click "Scrape pages" to discover and save this website's pages.
            </Typography>
          )}
          {pages.length > 0 && (
            <WebsitePagesTable pages={pages} onView={setViewing} onDelete={setRemoving} onError={setActionError} />
          )}
        </CardContent>
      </Card>

      <ScrapeDialog open={scrapeOpen} website={website} loading={scraping} onClose={() => setScrapeOpen(false)} onConfirm={doScrape} />
      <PageContentDialog page={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={!!removing}
        title={t('crm.components.deletePage')}
        message={`Remove "${removing?.url ?? ''}" from the saved pages?`}
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
    </Stack>
  );
}
