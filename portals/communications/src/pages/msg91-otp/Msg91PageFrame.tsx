import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import SmsIcon from '@mui/icons-material/Sms';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { MSG91_CONFIGURED } from './queries';
import { DateWindowForm, type DateWindowValues } from './date-window';

/** Environment Variables, opened on the MSG91 category tab. */
const ENVIRONMENT_MSG91 = '/?selectedtab_category=MSG91';

/** Whether MSG91 is configured; undefined until the server has answered. */
export function useMsg91Configured(): boolean | undefined {
  const { data } = useQuery(MSG91_CONFIGURED, { fetchPolicy: 'cache-and-network' });
  return data?.msg91Configured;
}

interface Props {
  title: string;
  subtitle: string;
  range: DateWindowValues;
  maxDays: number;
  loading: boolean;
  error?: unknown;
  onRange: (next: DateWindowValues) => void;
  children: ReactNode;
}

/**
 * What both MSG91 pages share: the heading, the "not configured yet" state
 * that sends the operator to the keys, the date window, and the error line.
 */
export default function Msg91PageFrame({
  title,
  subtitle,
  range,
  maxDays,
  loading,
  error,
  onRange,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const configured = useMsg91Configured();

  let body: ReactNode = <LinearProgress />;
  if (configured === false) {
    body = (
      <Alert
        severity="info"
        action={
          <Button component={RouterLink} to={ENVIRONMENT_MSG91} size="small">
            {t('tech.msg91.openEnvironment')}
          </Button>
        }
      >
        {t('tech.msg91.notConfigured')}
      </Alert>
    );
  } else if (configured) {
    body = (
      <>
        <DateWindowForm initial={range} maxDays={maxDays} busy={loading} onSubmit={onRange} />
        {error ? <Alert severity="error">{parseApiError(error)}</Alert> : null}
        {children}
      </>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <SmsIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      {body}
    </Stack>
  );
}
