import { Paper, Stack, Typography } from '@mui/material';
import type { PublicGrievanceOfficer } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  officer?: PublicGrievanceOfficer;
}

/**
 * The published Grievance Officer.
 *
 * Shown under the form rather than above it: someone on this screen came to
 * complain, not to read a contact card, but the details have to be published
 * where the grievance is raised. Until Legal fills them in, it says so instead
 * of rendering an empty block that looks broken.
 */
export default function GrievanceOfficerCard({ officer }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows: Array<[string, string]> = [
    [t('grievance.officerName'), officer?.name ?? ''],
    [t('grievance.officerEmail'), officer?.email ?? ''],
    [t('grievance.officerPhone'), officer?.phone ?? ''],
    [t('grievance.officerAddress'), officer?.address ?? ''],
  ];
  const filled = rows.filter(([, value]) => value.trim().length > 0);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {t('grievance.officerTitle')}
      </Typography>
      {filled.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('grievance.officerEmpty')}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {filled.map(([label, value]) => (
            <Stack key={label} direction="row" spacing={2} justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                {value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
