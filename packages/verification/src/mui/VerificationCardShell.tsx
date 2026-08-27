import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import {
  isVerificationSettled,
  rejectReasonOf,
  STATUS_META,
  TONE_CHIP_COLOR,
  VERIFICATION_LABEL_KEYS,
} from '../labels';
import type { Verification } from '../types';
import { useTranslation } from './i18n';

interface Props {
  item: Verification;
  /** Action control (upload button, address form) shown below the chip. */
  children?: ReactNode;
}

/** Card frame for one verification row — title, status chip, reject reason. */
export default function VerificationCardShell({ item, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const meta = STATUS_META[item.status];
  const settled = isVerificationSettled(item.status);
  const reason = rejectReasonOf(item);
  const tickColor = settled ? 'success.main' : 'action.disabled';

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }} data-testid={`verification-${item.type}`}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <CheckCircleIcon sx={{ color: tickColor, mt: 0.25 }} aria-hidden />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t(VERIFICATION_LABEL_KEYS[item.type])}
            </Typography>
            <Chip
              size="small"
              label={t(meta.labelKey)}
              color={TONE_CHIP_COLOR[meta.tone]}
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
            {reason && (
              <Typography
                variant="caption"
                sx={{ color: 'error.main', display: 'block', mt: 0.5 }}
              >
                {reason}
              </Typography>
            )}
            {children}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
