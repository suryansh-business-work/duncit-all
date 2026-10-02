import { Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import type { WaExtraction } from '../../whatsappQueries';
import { useTranslation } from '@duncit/shell';

export default function StatsDialog({ job, open, onClose }: Readonly<{ job: WaExtraction; open: boolean; onClose: () => void }>) {
  const { t } = useTranslation();
  const rows: [string, number | string][] = [
    [t('shell.common.status'), job.status],
    ['Communities', job.communities],
    ['Groups', job.groups],
    ['Contacts processed', `${job.processed} / ${job.total}`],
    ['Valid numbers', job.valid],
    ['Invalid / skipped', job.invalid],
    ['Duplicates (already saved)', job.duplicates],
    ['New leads created', job.leads_created],
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
