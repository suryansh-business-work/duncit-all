import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from '@duncit/app-settings';
import { STATUS_META, VERIFICATION_LABEL_KEYS, type Verification } from './queries';

interface Props {
  item: Verification;
  /** Action control (upload button, form, etc.) shown below the chip. */
  children?: ReactNode;
}

/** Shared card frame for a verification row — title, status chip, reject reason. */
export default function VerificationCardShell({ item, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const meta = STATUS_META[item.status];
  const done = item.status === 'APPROVED' || item.status === 'VERIFIED_BY_APP';
  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <CheckCircleIcon
            sx={{ color: done ? 'success.main' : 'action.disabled', mt: 0.25 }}
            aria-hidden
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {t(VERIFICATION_LABEL_KEYS[item.type])}
            </Typography>
            <Chip
              size="small"
              label={t(meta.labelKey)}
              color={meta.color}
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
            {item.status === 'REJECTED' && item.reject_reason && (
              <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5 }}>
                {item.reject_reason}
              </Typography>
            )}
            {children}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
