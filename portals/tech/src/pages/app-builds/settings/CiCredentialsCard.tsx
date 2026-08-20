import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/Key';
import { useTranslation } from '@duncit/shell';
import { notify, notifyError } from '@duncit/dialogs';
import { copyToClipboard } from '@duncit/utils';
import {
  ISSUE_APP_BUILD_CI_TOKEN,
  type AppBuildCiToken,
  type AppBuildSettings,
} from '../queries';
import { formatDateTime } from '@duncit/app-settings';

/** A copy button that reports whether the clipboard actually took the value. */
function CopyAdornment({ value, label }: Readonly<{ value: string; label: string }>) {
  const { t } = useTranslation();
  const onCopy = useCallback(() => {
    copyToClipboard(value)
      .then((ok) => {
        // The clipboard API is unavailable on insecure origins and rejects when
        // the document is not focused, so a silent no-op is a real outcome.
        if (ok) notify(t('tech.appBuilds.ciCopied'), 'success');
        else notifyError(t('tech.appBuilds.ciCopyFailed'));
      })
      .catch(() => notifyError(t('tech.appBuilds.ciCopyFailed')));
  }, [value, t]);

  return (
    <InputAdornment position="end">
      <Tooltip title={label}>
        <IconButton onClick={onCopy} edge="end" aria-label={label}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </InputAdornment>
  );
}

/** The minted token, shown once. */
function IssuedToken({ issued }: Readonly<{ issued: AppBuildCiToken }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Alert severity="success">
        {t('tech.appBuilds.ciTokenIssued', { vars: { account: issued.issued_for } })}
      </Alert>
      <TextField
        label={t('tech.appBuilds.ciSecretName')}
        value={issued.secret_name}
        size="small"
        InputProps={{
          readOnly: true,
          endAdornment: (
            <CopyAdornment value={issued.secret_name} label={t('tech.appBuilds.ciCopyName')} />
          ),
        }}
      />
      <TextField
        label={t('tech.appBuilds.ciSecretValue')}
        value={issued.token}
        size="small"
        multiline
        minRows={3}
        InputProps={{
          readOnly: true,
          sx: { fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' },
          endAdornment: (
            <CopyAdornment value={issued.token} label={t('tech.appBuilds.ciCopyValue')} />
          ),
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {t('tech.appBuilds.ciTokenOnce')}
      </Typography>
    </Stack>
  );
}

/** Last-report evidence, or a note that CI has never reached us. */
function ReportingStatus({ settings }: Readonly<{ settings: AppBuildSettings }>) {
  const { t } = useTranslation();
  if (!settings.last_reported_at) {
    return <Alert severity="warning">{t('tech.appBuilds.ciNeverReported')}</Alert>;
  }
  return (
    <Alert severity="success">
      {t('tech.appBuilds.ciLastReported', {
        vars: {
          // Date AND time, matching the builds table and the details dialog. The
          // time is the point here: after pasting the secret you are looking for
          // a report from minutes ago, which a date alone cannot show.
          when: formatDateTime(settings.last_reported_at),
          account: settings.last_reported_by ?? '—',
        },
      })}
    </Alert>
  );
}

/**
 * Where the build workflows' credential comes from.
 *
 * CI cannot read this database without already being authenticated, so one
 * secret has to live in GitHub — there is no design that removes it. What this
 * removes is hand-crafting the JWT: press the button, copy the value, paste it
 * into the named repo secret. The token carries the pressing admin's own roles
 * and is never stored here.
 */
export default function CiCredentialsCard({ settings }: Readonly<{ settings: AppBuildSettings }>) {
  const { t } = useTranslation();
  const [issued, setIssued] = useState<AppBuildCiToken | null>(null);
  const [issue, issuing] = useMutation<{ issueAppBuildCiToken: AppBuildCiToken }>(
    ISSUE_APP_BUILD_CI_TOKEN
  );

  const onIssue = useCallback(() => {
    issue()
      .then((res) => setIssued(res.data?.issueAppBuildCiToken ?? null))
      .catch((err) => notifyError(err instanceof Error ? err.message : String(err)));
  }, [issue]);

  return (
    <Card sx={{ maxWidth: 640, mt: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {t('tech.appBuilds.ciTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('tech.appBuilds.ciSubtitle')}
            </Typography>
          </Box>
          <ReportingStatus settings={settings} />
          {issued ? (
            <IssuedToken issued={issued} />
          ) : (
            <Stack direction="row">
              <Button
                variant="outlined"
                startIcon={<KeyIcon />}
                onClick={onIssue}
                disabled={issuing.loading}
              >
                {issuing.loading ? t('tech.appBuilds.ciIssuing') : t('tech.appBuilds.ciIssue')}
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
