import { useQuery } from '@apollo/client/react';
import { Chip, List, ListItem, ListItemText } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { formatDate, useTranslation } from '@duncit/app-settings';
import type { SslLiveCheck } from '@duncit/gql-types';
import { SSL_LIVE_CHECK } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The one word that says what a visitor to this host would get. */
function verdict(row: SslLiveCheck, t: Translate): { label: string; color: 'success' | 'warning' | 'error' | 'default' } {
  if (!row.checked) return { label: t('tech.ssl.liveNotChecked'), color: 'default' };
  if (!row.reachable) return { label: t('tech.ssl.liveUnreachable'), color: 'error' };
  if (!row.trusted) return { label: t('tech.ssl.liveUntrusted'), color: 'error' };
  if (!row.serving_this) return { label: t('tech.ssl.liveOtherCert'), color: 'warning' };
  return { label: t('tech.ssl.liveServing'), color: 'success' };
}

function secondaryOf(row: SslLiveCheck, t: Translate): string | undefined {
  if (row.error) return row.error;
  if (row.valid_to) return t('tech.ssl.liveServedExpiry', { vars: { date: formatDate(row.valid_to) } });
  return undefined;
}

/**
 * Every host on one certificate, dialled over HTTPS right now. A certificate on
 * disk proves nothing on its own — nginx may still be serving the old one, or
 * another site's — so this is what says the renewal actually reached visitors.
 */
export default function SslLiveCheckList({ name }: Readonly<{ name: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(SSL_LIVE_CHECK, { variables: { name }, fetchPolicy: 'network-only' });
  const rows = data?.sslLiveCheck ?? [];

  return (
    <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
      <List dense aria-label={t('tech.ssl.liveTitle')} data-testid="ssl-live-check">
        {rows.map((row) => {
          const { label, color } = verdict(row, t);
          return (
            <ListItem key={row.domain} disableGutters secondaryAction={<Chip size="small" color={color} label={label} />}>
              <ListItemText
                primary={row.domain}
                secondary={secondaryOf(row, t)}
                slotProps={{ primary: { sx: { wordBreak: 'break-all', pr: 14 } } }}
              />
            </ListItem>
          );
        })}
      </List>
    </QueryGuard>
  );
}
