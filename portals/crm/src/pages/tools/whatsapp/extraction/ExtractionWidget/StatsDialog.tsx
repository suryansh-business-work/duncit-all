import { Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import type { WaExtraction } from '../../whatsappQueries';
import { useTranslation } from '@duncit/shell';

export default function StatsDialog({ job, open, onClose }: Readonly<{ job: WaExtraction; open: boolean; onClose: () => void }>) {
  const { t } = useTranslation();
  const rows: [string, number | string][] = [
    [t('shell.common.status'), job.status],
    [t('crm.common.communities'), job.communities],
    [t('crm.common.groups'), job.groups],
    [t('crm.tools.contactsProcessedLabel'), `${job.processed} / ${job.total}`],
    [t('crm.tools.validNumbers'), job.valid],
    [t('crm.tools.invalidSkipped'), job.invalid],
    [t('crm.tools.duplicatesAlreadySaved'), job.duplicates],
    [t('crm.tools.newLeadsCreated'), job.leads_created],
  ];
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('crm.tools.extractionSummary')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          {rows.map(([label, value]) => (
            <Stack key={label} direction="row" sx={{
              justifyContent: "space-between"
            }}>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>{label}</Typography>
              <Typography variant="body2" sx={{
                fontWeight: 700
              }}>{value}</Typography>
            </Stack>
          ))}
          {job.error && <Typography variant="body2" color="error" role="alert">{job.error}</Typography>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
