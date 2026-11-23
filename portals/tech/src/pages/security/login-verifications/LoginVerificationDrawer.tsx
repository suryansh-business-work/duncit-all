import { useEffect, useId } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import LogDetailSections from './detail';
import { detailErrorText } from './detailError';
import { PORTAL_SECURITY_LOG } from './queries';

interface Props {
  /** The record to open. Null keeps the drawer, and the query behind it, unmounted. */
  id: string | null;
  onClose: () => void;
}

const PAPER_SX = { width: '100%', maxWidth: (theme: Theme) => theme.breakpoints.values.sm } as const;

interface BodyProps {
  id: string;
  titleId: string;
  onClose: () => void;
}

function DrawerBody({ id, titleId, onClose }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  // Straight from the server, every time, and never kept: opening a record is
  // what writes its access entry, so a cached answer would be a read nobody can
  // see — and this answer carries the full address and position.
  const { data, loading, error } = useQuery(PORTAL_SECURITY_LOG, { variables: { id }, fetchPolicy: 'no-cache' });
  const detail = data?.portalSecurityLog;
  // The reviewer is told in words; whoever supports them is told which record and why.
  useEffect(() => {
    if (error) logs.portal.tech.error('LoginVerifications', 'openRecord', { error, record_id: id });
  }, [error, id]);
  return (
    <Stack sx={{ height: '100%' }}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, p: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" id={titleId}>
            {t('tech.loginVerifications.detail.title')}
          </Typography>
          {detail && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {detail.user_name}
            </Typography>
          )}
        </Box>
        <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose} data-testid="login-verification-close">
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <QueryGuard
          loading={loading}
          error={error}
          errorText={error ? detailErrorText(t, error) : undefined}
          notFound={!detail}
        >
          {detail && <LogDetailSections detail={detail} />}
        </QueryGuard>
      </Box>
    </Stack>
  );
}

/** One verification in full, in a drawer over the table, so the list keeps its place while a record is read. */
export default function LoginVerificationDrawer({ id, onClose }: Readonly<Props>) {
  const titleId = useId();
  if (!id) return null;
  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId, sx: PAPER_SX } }}
    >
      <DrawerBody id={id} titleId={titleId} onClose={onClose} />
    </Drawer>
  );
}
