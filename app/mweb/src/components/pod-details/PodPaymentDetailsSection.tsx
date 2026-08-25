import { Box, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  amount: number;
  isFree: boolean;
  priceCompute: (amt: number) => {
    subtotal: number;
    fee: number;
    feePct: number;
    gst: number;
    gstPct: number;
    total: number;
    currency: string;
  };
}

export default function PodPaymentDetailsSection({
  amount,
  isFree,
  priceCompute,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (isFree || !Number(amount)) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {t('mweb.podDetails.freeToJoin')}
      </Typography>
    );
  }
  const p = priceCompute(amount);
  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          py: 0.5
        }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('mweb.checkout.gst', { vars: { pct: p.gstPct } })}
        </Typography>
        <Typography variant="body2" sx={{
          fontWeight: 500
        }}>
          {`${p.currency}${p.gst.toFixed(2)}`}
        </Typography>
      </Stack>
      <Divider sx={{ my: 1 }} />
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          py: 0.5
        }}>
        {/*
          Per SEAT, and it has to say so. This prices one ticket, while the
          button on the same screen prices however many the seat picker holds —
          calling this "Total payable" put two different totals in front of the
          buyer and only one of them was what they would be charged.
        */}
        <Typography variant="subtitle2" sx={{
          fontWeight: 700
        }}>
          {t('mweb.podDetails.pricePerSeat')}
        </Typography>
        <Typography variant="subtitle2" sx={{
          fontWeight: 700
        }}>
          {p.currency}
          {p.total.toFixed(2)}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mt: 1
        }}>
        {t('mweb.podDetails.inclusiveOfGst')}
      </Typography>
    </Box>
  );
}
