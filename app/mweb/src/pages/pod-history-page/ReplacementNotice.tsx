import { useState } from 'react';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  deductionPct: number;
}

/** Shown next to the Rejoin option for a backed-out member: reassures them we're
 * finding a replacement and, on info tap, explains the % deduction on the refund
 * once someone fills their spot. Percentage is dynamic (Finance → Default
 * Deductions → Backouts). */
export default function ReplacementNotice({ deductionPct }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, Number(deductionPct) || 0));

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" spacing={0.5} sx={{
        alignItems: "center"
      }}>
        <Typography variant="body2" sx={{
          fontWeight: 600
        }}>
          {t('mweb.podHistory.findingReplacement')}
        </Typography>
        <DuncitIconButton
          size="small"
          aria-label={t('mweb.podHistory.refundDetails')}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <InfoOutlinedIcon fontSize="small" color="action" />
        </DuncitIconButton>
      </Stack>
      <Collapse in={open}>
        <Typography
          variant="body2"
          sx={{
            color: "success.main",
            fontWeight: 600,
            mt: 0.5
          }}>
          {t('mweb.podHistory.replacementRefundNote', { vars: { pct } })}
        </Typography>
      </Collapse>
    </Box>
  );
}
