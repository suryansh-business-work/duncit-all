import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Chip, Dialog, DialogContent, DialogTitle, LinearProgress, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteSection } from '@duncit/gql-types';
import { CMS_SITE_REVISIONS, REFETCH_AFTER_RESTORE, RESTORE_CMS_SITE_REVISION, type CmsSiteRevisionsData } from '../queries/revisions';
import { cmsErrorMessage } from '../lib/errors';

const SECTIONS: readonly CmsSiteSection[] = ['SETTINGS', 'DESIGN', 'CODE'];
const asSection = (value: string): CmsSiteSection | '' => SECTIONS.find((section) => section === value) ?? '';

interface Props {
  site: { id: string; name: string };
  open: boolean;
  onClose: () => void;
}

/** A website's saved states — settings, design system, site code — each one restorable. */
export default function SiteRevisionsDialog({ site, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { formatDateTime } = useDateFormat();
  const [section, setSection] = useState<CmsSiteSection | ''>('');
  const { data, loading, error } = useQuery<CmsSiteRevisionsData>(CMS_SITE_REVISIONS, {
    variables: { siteId: site.id, section: section || null },
    skip: !open,
    fetchPolicy: 'network-only',
  });
  const [restore, { loading: restoring }] = useMutation(RESTORE_CMS_SITE_REVISION, { refetchQueries: REFETCH_AFTER_RESTORE });
  const revisions = data?.cmsSiteRevisions ?? [];
  const sectionLabel: Record<CmsSiteSection, string> = {
    SETTINGS: t('websiteApp.cms.revisions.settings'),
    DESIGN: t('websiteApp.cms.revisions.design'),
    CODE: t('websiteApp.cms.revisions.code'),
  };

  const askRestore = async (id: string, revision: number, of: CmsSiteSection) => {
    const ok = await confirm({
      title: t('websiteApp.cms.revisions.restoreTitle', { vars: { revision } }),
      message: t('websiteApp.cms.revisions.restoreText', { vars: { section: sectionLabel[of], name: site.name } }),
      confirmLabel: t('websiteApp.cms.revisions.restore'),
    });
    if (!ok) return;
    try {
      await restore({ variables: { id } });
      notifySuccess(t('websiteApp.cms.revisions.restored', { vars: { revision } }));
    } catch (failure) {
      notifyError(cmsErrorMessage(failure, t('websiteApp.cms.revisions.restoreFailed')));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('websiteApp.cms.revisions.title', { vars: { name: site.name } })}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('websiteApp.cms.revisions.intro')}
          </Typography>
          <TextField select size="small" label={t('websiteApp.cms.revisions.show')} value={section} onChange={(event) => setSection(asSection(event.target.value))}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            sx={{ maxWidth: 260 }}
          >
            <MenuItem value="">{t('websiteApp.cms.revisions.all')}</MenuItem>
            {SECTIONS.map((key) => (
              <MenuItem key={key} value={key}>
                {sectionLabel[key]}
              </MenuItem>
            ))}
          </TextField>
          {loading && <LinearProgress aria-label={t('websiteApp.cms.revisions.loading')} />}
          {error && <Alert severity="error">{t('websiteApp.cms.revisions.loadFailed')}</Alert>}
          {!loading && !error && revisions.length === 0 && <Typography color="text.secondary">{t('websiteApp.cms.revisions.empty')}</Typography>}
          <List disablePadding>
            {revisions.map((revision, index) => (
              <ListItem
                key={revision.id}
                divider
                secondaryAction={
                  <DuncitButton
                    size="small"
                    startIcon={<RestoreIcon fontSize="small" />}
                    disabled={restoring}
                    aria-label={`${t('websiteApp.cms.revisions.restore')}: ${t('websiteApp.cms.revisions.number', { vars: { revision: revision.revision } })}`}
                    onClick={() => {
                      askRestore(revision.id, revision.revision, revision.section).catch(() => notifyError(t('websiteApp.cms.revisions.restoreFailed')));
                    }}
                  >
                    {t('websiteApp.cms.revisions.restore')}
                  </DuncitButton>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} component="span" sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{t('websiteApp.cms.revisions.number', { vars: { revision: revision.revision } })}</span>
                      <Chip size="small" label={sectionLabel[revision.section]} />
                      {index === 0 && !section && <Chip size="small" color="primary" variant="outlined" label={t('websiteApp.cms.revisions.latest')} />}
                    </Stack>
                  }
                  secondary={[
                    formatDateTime(revision.created_at),
                    revision.restored_from ? t('websiteApp.cms.revisions.restoredFrom', { vars: { revision: revision.restored_from } }) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </ListItem>
            ))}
          </List>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
