import type { ReactNode } from 'react';
import { Box, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import { usePortalT } from '../../../shared/i18n';
import { EnumChip } from '../../components/EnumChip';
import { EMAIL_STATUS_COLORS, EMAIL_STATUS_KEYS } from '../../components/enum-labels';
import type { LiteEmailLogRow } from '../../graphql/email';

interface Props {
  log: LiteEmailLogRow | null;
  onClose: () => void;
}

function DetailRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Box>
      <Typography variant="caption" component="dt" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}

/** One log line in full: the recipient, the template, the outcome and the provider's message id or error. */
export function EmailLogDrawer({ log, onClose }: Readonly<Props>) {
  const { t } = usePortalT();
  return (
    <Drawer anchor="right" open={Boolean(log)} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 } } } }} aria-labelledby="email-log-drawer-title">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography id="email-log-drawer-title" variant="h6" component="h2">
            {t('litePortal.emailLogs.detailTitle')}
          </Typography>
          <DuncitIconButton onClick={onClose} aria-label={t('litePortal.common.close')} data-testid="email-log-drawer-close">
            <CloseIcon />
          </DuncitIconButton>
        </Stack>
        {log && (
          <Stack component="dl" spacing={1.5} sx={{ m: 0 }}>
            <DetailRow label={t('litePortal.emailLogs.colTo')}>{log.to}</DetailRow>
            <DetailRow label={t('litePortal.emailLogs.colSubject')}>{log.subject}</DetailRow>
            <DetailRow label={t('litePortal.emailLogs.colTemplate')}>{log.template_key}</DetailRow>
            <DetailRow label={t('litePortal.emailLogs.colStatus')}>
              <EnumChip value={log.status} keys={EMAIL_STATUS_KEYS} colors={EMAIL_STATUS_COLORS} />
            </DetailRow>
            <DetailRow label={t('litePortal.emailLogs.colSent')}>{formatDateTime(log.created_at)}</DetailRow>
            <DetailRow label={t('litePortal.emailLogs.messageId')}>{log.message_id ?? EM_DASH}</DetailRow>
            <DetailRow label={t('litePortal.emailLogs.colError')}>{log.error ?? t('litePortal.emailLogs.noError')}</DetailRow>
          </Stack>
        )}
      </Stack>
    </Drawer>
  );
}
