import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Dialog, DialogContent, DialogTitle, Skeleton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { CMS_SITES, CREATE_CMS_SITE, type CmsSitesData } from '../queries/sites';
import { cmsErrorMessage } from '../lib/errors';
import { SiteForm, toSiteInput, type SiteFormOutput } from './site-form';
import SiteCard from './SiteCard';

/** Every website the CMS serves, and the way to start a new one. */
export default function SitesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<CmsSitesData>(CMS_SITES, { fetchPolicy: 'cache-and-network' });
  const [createSite] = useMutation<{ createCmsSite: { id: string } }>(CREATE_CMS_SITE);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sites = data?.cmsSites ?? [];

  const create = async (values: SiteFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      const result = await createSite({ variables: { input: toSiteInput(values) } });
      setOpen(false);
      await refetch();
      const id = result.data?.createCmsSite.id;
      if (id) navigate(`/sites/${id}`);
    } catch (err) {
      setSaveError(cmsErrorMessage(err, t('websiteApp.cms.site.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('websiteApp.cms.title')}
        subtitle={t('websiteApp.cms.subtitle')}
        titleWeight={700}
        actions={
          <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} data-testid="cms-new-site">
            {t('websiteApp.cms.newSite')}
          </DuncitButton>
        }
      />
      {error && <Alert severity="error">{t('websiteApp.cms.loadFailed')}</Alert>}
      {loading && !data && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={168} />
          ))}
        </Box>
      )}
      {!loading && !error && sites.length === 0 && (
        <Typography color="text.secondary" data-testid="cms-no-sites">
          {t('websiteApp.cms.noSites')}
        </Typography>
      )}
      {sites.length > 0 && (
        <Box
          component="ul"
          sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}
        >
          {sites.map((site) => (
            <li key={site.id}>
              <SiteCard site={site} />
            </li>
          ))}
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('websiteApp.cms.site.dialogNew')}</DialogTitle>
        <DialogContent dividers>
          <SiteForm
            site={null}
            fragments={[]}
            submitting={submitting}
            errorMessage={saveError}
            onSubmit={(values) => {
              create(values).catch(() => setSaveError(t('websiteApp.cms.site.saveFailed')));
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
