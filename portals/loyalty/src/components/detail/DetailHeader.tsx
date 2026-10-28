import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Props {
  /** Where "back" goes — the list this record was opened from. */
  backTo: string;
  backLabel: string;
  title: string;
  /** Under the title: what the record is, in one line. */
  subtitle?: string;
  /** The status chip, beside the title. */
  status?: ReactNode;
  /** Buttons at the right end (cancel, export). */
  actions?: ReactNode;
}

/** The top of a record page: the way back, what this is, its status and what can be done to it. */
export default function DetailHeader({ backTo, backLabel, title, subtitle, status, actions }: Readonly<Props>) {
  return (
    <Stack spacing={1}>
      <Link
        component={RouterLink}
        to={backTo}
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, alignSelf: 'flex-start' }}
      >
        <ArrowBackIcon fontSize="small" />
        {backLabel}
      </Link>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 900, wordBreak: 'break-word' }}>
              {title}
            </Typography>
            {status}
          </Stack>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Stack>
        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
