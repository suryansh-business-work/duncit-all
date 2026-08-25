import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import { format } from 'date-fns';

/** The `me`-query fields the account card renders. */
export interface AccountSummaryUser {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  phone_extension?: string | null;
  created_at?: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(Number.isNaN(Number(value)) ? value : Number(value));
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'PP');
};

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
        md: 3
      }}>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {label}
      </Typography>
      <Typography variant="body2" noWrap title={value} sx={{
        fontWeight: 600
      }}>
        {value}
      </Typography>
    </Grid>
  );
}

/**
 * The "Your account" details card — fully driven by the `me` query. Previously
 * carried as a byte-identical `pages/dashboard/AccountSummary.tsx` copy in the
 * hr / employee / ads-portal / finance / onboarding portals.
 */
export function AccountSummaryCard({ user }: Readonly<{ user?: AccountSummaryUser | null }>) {
  const { t } = useTranslation();
  const name = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—';
  const phone = user?.phone_number ? `${user?.phone_extension ?? ''} ${user.phone_number}`.trim() : '—';
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            Your account
          </Typography>
          <Grid container spacing={2}>
            <Detail label={t('shell.account.name')} value={name} />
            <Detail label={t('shell.account.email')} value={user?.email || '—'} />
            <Detail label={t('shell.account.phone')} value={phone} />
            <Detail label={t('shell.account.memberSince')} value={formatDate(user?.created_at)} />
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
