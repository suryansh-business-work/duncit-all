import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { EcommBrand } from '../queries';

interface Props {
  brand: EcommBrand | null;
  percent: number;
  busy: boolean;
  onWithdraw: () => void;
}

/** The progress line and the one alert a brand's status earns: under review, approved, or rejected. */
export default function BrandWizardAlerts({ brand, percent, busy, onWithdraw }: Readonly<Props>) {
  const { t } = useTranslation();
  const progressLabel = t('partners.brandWizard.progress', { vars: { percent } });
  return (
    <Stack spacing={1.5}>
      <Box data-testid="brand-wizard-progress">
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {progressLabel}
        </Typography>
        <LinearProgress variant="determinate" value={percent} aria-label={progressLabel} sx={{ height: 8, borderRadius: 4 }} />
      </Box>
      {brand?.status === 'SUBMITTED' && (
        <Alert
          severity="info"
          data-testid="brand-wizard-under-review"
          action={
            <DuncitButton color="inherit" size="small" onClick={onWithdraw} disabled={busy} data-testid="brand-wizard-withdraw">
              {t('partners.brandWizard.withdraw')}
            </DuncitButton>
          }
        >
          {t('partners.brandWizard.underReview')}
        </Alert>
      )}
      {brand?.status === 'APPROVED' && (
        <Alert severity="success" data-testid="brand-wizard-approved">
          {t('partners.brandWizard.approvedLocked')}
        </Alert>
      )}
      {brand?.status === 'REJECTED' && (
        <Alert severity="error" data-testid="brand-wizard-rejected">
          {t('partners.brandWizard.rejected', { vars: { notes: brand.reviewer_notes || '' } })}
        </Alert>
      )}
    </Stack>
  );
}
