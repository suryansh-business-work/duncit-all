import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Paper, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { DELETE_CMS_SITE, UPDATE_CMS_SITE, type CmsSiteRow } from '../queries/sites';
import { CMS_FRAGMENT_OPTIONS, type CmsFragmentOptionsData } from '../queries/fragments';
import { cmsErrorMessage } from '../lib/errors';
import { SiteForm, toSiteInput, type SiteFormOutput } from '../sites/site-form';
import DnsPanel from './DnsPanel';

interface Props {
  site: CmsSiteRow;
  onSaved: () => void;
}

/** The site's own settings, and — for an empty site — deleting it. */
export default function SettingsTab({ site, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const fragments = useQuery<CmsFragmentOptionsData>(CMS_FRAGMENT_OPTIONS, { variables: { siteId: site.id }, fetchPolicy: 'network-only' });
  const [updateSite] = useMutation(UPDATE_CMS_SITE);
  const [deleteSite] = useMutation(DELETE_CMS_SITE);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async (values: SiteFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      await updateSite({ variables: { id: site.id, input: toSiteInput(values) } });
      notifySuccess(t('websiteApp.cms.site.saved'));
      onSaved();
    } catch (error) {
      setSaveError(cmsErrorMessage(error, t('websiteApp.cms.site.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('websiteApp.cms.site.deleteTitle'),
      message: t('websiteApp.cms.site.deleteText', { vars: { name: site.name } }),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSite({ variables: { id: site.id } });
      navigate('/sites');
    } catch (error) {
      notifyError(cmsErrorMessage(error, t('websiteApp.cms.site.deleteFailed')));
    }
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <SiteForm
          key={site.updated_at}
          site={site}
          fragments={(fragments.data?.cmsFragments ?? []).map((f) => ({ id: f.id, name: f.name, kind: f.kind }))}
          submitting={submitting}
          errorMessage={saveError}
          onSubmit={(values) => {
            save(values).catch(() => setSaveError(t('websiteApp.cms.site.saveFailed')));
          }}
        />
      </Paper>
      <DnsPanel siteId={site.id} />
      <DuncitButton
        color="error"
        variant="outlined"
        startIcon={<DeleteOutlineIcon />}
        sx={{ alignSelf: 'flex-start' }}
        onClick={() => {
          remove().catch(() => notifyError(t('websiteApp.cms.site.deleteFailed')));
        }}
      >
        {t('shell.common.delete')}
      </DuncitButton>
    </Stack>
  );
}
