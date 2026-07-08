import { useState } from 'react';
import { Box, Collapse, IconButton, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface Props {
  deductionPct: number;
}

/** Shown next to the Rejoin option for a backed-out member: reassures them we're
 * finding a replacement and, on info tap, explains the % deduction on the refund
 * once someone fills their spot. Percentage is dynamic (Finance → Default
 * Deductions → Backouts). */
export default function ReplacementNotice({ deductionPct }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const pct = Math.max(0, Math.min(100, Number(deductionPct) || 0));

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="body2" fontWeight={800}>
          We are finding your replacement
        </Typography>
        <IconButton
          size="small"
          aria-label="Refund details"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <InfoOutlinedIcon fontSize="small" color="action" />
        </IconButton>
      </Stack>
      <Collapse in={open}>
        <Typography variant="body2" color="success.main" fontWeight={600} sx={{ mt: 0.5 }}>
          We are finding your replacement. If someone fills your spot, the refund will be initiated
          with {pct}% deduction.
        </Typography>
      </Collapse>
    </Box>
  );
}
