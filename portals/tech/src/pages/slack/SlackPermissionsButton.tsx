import { useState, type MouseEvent } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { SLACK_PERMISSIONS, type SlackPermissions, type SlackScope } from './queries';

/**
 * Every Slack failure this page can show — not_in_channel, missing_scope, an
 * empty channel list — is really the same question: what is this bot allowed to
 * do? Slack answers it in a response header nobody can see, so it is answered
 * here, next to the failures, with the links that change it.
 */

interface ScopeRowProps {
  scope: SlackScope;
  /** When false, Slack did not say — so nothing is marked as missing. */
  known: boolean;
  optionalLabel: string;
}

function ScopeIcon({ granted, known }: Readonly<{ granted: boolean; known: boolean }>) {
  if (!known) return <HelpOutlineIcon sx={{ fontSize: 16 }} color="disabled" />;
  if (granted) return <CheckCircleIcon sx={{ fontSize: 16 }} color="success" />;
  return <CancelIcon sx={{ fontSize: 16 }} color="error" />;
}

function ScopeRow({ scope, known, optionalLabel }: Readonly<ScopeRowProps>) {
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "flex-start"
    }}>
      <Box sx={{ pt: 0.25 }}>
        <ScopeIcon granted={scope.granted} known={known} />
      </Box>
      <Stack sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: "center"
        }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
            {scope.scope}
          </Typography>
          {!scope.required && <Chip size="small" variant="outlined" label={optionalLabel} />}
        </Stack>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {scope.purpose}
        </Typography>
      </Stack>
    </Stack>
  );
}

/** The panel body, so the button below stays about opening and closing it. */
function PermissionsBody({ data }: Readonly<{ data: SlackPermissions }>) {
  const { t } = useTranslation();
  if (!data.configured) {
    return <Alert severity="warning">{t('tech.slack.notConfigured')}</Alert>;
  }

  return (
    <Stack spacing={1.25}>
      {data.team && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {t('tech.slack.permissionsTeam', { vars: { team: data.team } })}
        </Typography>
      )}
      {data.error && <Alert severity="error">{data.error}</Alert>}
      {/* A token can work perfectly and still not report its scopes. Saying so
          beats a column of red crosses that would send someone reinstalling a
          Slack app that was never broken. */}
      {!data.error && !data.scopes_known && (
        <Alert severity="info">{t('tech.slack.permissionsUnknown')}</Alert>
      )}
      <Stack spacing={1}>
        {data.scopes.map((scope) => (
          <ScopeRow
            key={scope.scope}
            scope={scope}
            known={data.scopes_known}
            optionalLabel={t('tech.slack.scopeOptional')}
          />
        ))}
      </Stack>
      <Divider />
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('tech.slack.permissionsHowTo')}
      </Typography>
      <Stack direction="row" spacing={2}>
        <Link href={data.app_url} target="_blank" rel="noreferrer" variant="caption">
          {t('tech.slack.openSlackApps')}
        </Link>
        <Link href={data.docs_url} target="_blank" rel="noreferrer" variant="caption">
          {t('tech.slack.scopeDocs')}
        </Link>
      </Stack>
    </Stack>
  );
}

/** An info button that opens the bot's permissions, fetched only when opened. */
export default function SlackPermissionsButton() {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { data, loading } = useQuery<{ slackPermissions: SlackPermissions }>(SLACK_PERMISSIONS, {
    skip: !anchor,
    fetchPolicy: 'cache-and-network',
  });

  const open = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const permissions = data?.slackPermissions;

  return (
    <>
      <Tooltip title={t('tech.slack.permissionsTitle')}>
        <DuncitIconButton size="small" onClick={open} aria-label={t('tech.slack.permissionsTitle')}>
          <InfoOutlinedIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, p: 2, width: 380, maxWidth: '92vw' } } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('tech.slack.permissionsTitle')}
        </Typography>
        {loading && !permissions && <CircularProgress size={20} />}
        {permissions && <PermissionsBody data={permissions} />}
      </Popover>
    </>
  );
}
