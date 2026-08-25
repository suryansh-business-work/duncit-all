import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

interface Charge {
  label: string;
  amount: number;
  note?: string | null;
}

interface Props {
  charges: Charge[];
  currency?: string;
}

export default function PodPlaceChargesSection({ charges, currency = '\u20b9' }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!charges || charges.length === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {t('mweb.podDetails.noVenueCharges')}
      </Typography>
    );
  }
  return (
    <Stack divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}>
      {charges.map((c, i) => (
        <Stack
          key={`${c.label}-${i}`}
          direction="row"
          sx={{
            alignItems: "flex-start",
            justifyContent: "space-between",
            py: 1
          }}>
          <Box sx={{ flex: 1, pr: 1 }}>
            <Typography variant="body2" sx={{
              fontWeight: 500
            }}>
              {c.label}
            </Typography>
            {c.note && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {c.note}
              </Typography>
            )}
          </Box>
          <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
            {currency}
            {c.amount}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
